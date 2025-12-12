from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers
from .models import Currency, Wallet, FxRate, Category, Transaction, Budget, TransferLink
from django.db import transaction as db_transaction
from django.utils import timezone

class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ["id", "code", "name", "symbol"]

class WalletSerializer(serializers.ModelSerializer):
    currency = CurrencySerializer(read_only=True)
    currency_id = serializers.PrimaryKeyRelatedField(
        queryset=Currency.objects.all(),
        source="currency",
        write_only=True
    )

    class Meta:
        model = Wallet
        fields = [
            "id", "name", "type",
            "currency", "currency_id",
            "opening_balance", "is_active",
            "created_at", "updated_at",
        ]

class FxRateSerializer(serializers.ModelSerializer):
    base = CurrencySerializer(read_only=True)
    quote = CurrencySerializer(read_only=True)
    base_id = serializers.PrimaryKeyRelatedField(queryset=Currency.objects.all(), source="base", write_only=True)
    quote_id = serializers.PrimaryKeyRelatedField(queryset=Currency.objects.all(), source="quote", write_only=True)

    class Meta:
        model = FxRate
        fields = ["id", "date", "base", "quote", "rate", "base_id", "quote_id"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "type", "name", "parent"]


def _get_fx_rate(date, from_currency: Currency, to_currency: Currency) -> Decimal:
    """
    หา fx rate ที่ใช้แปลง: from_currency -> to_currency
    - ถ้า currency เหมือนกัน rate=1
    - หาเรทตรง base=from quote=to
    - ถ้าไม่เจอ ลองหา inverse แล้วกลับค่า 1/rate
    """
    if from_currency.id == to_currency.id:
        return Decimal("1.0")

    direct = FxRate.objects.filter(date=date, base=from_currency, quote=to_currency).first()
    if direct:
        return Decimal(direct.rate)

    inv = FxRate.objects.filter(date=date, base=to_currency, quote=from_currency).first()
    if inv:
        return Decimal("1.0") / Decimal(inv.rate)

    raise serializers.ValidationError(
        f"Missing FX rate for {date}: {from_currency.code}->{to_currency.code}. "
        f"Create it via /api/fx-rates/ first."
    )


class TransactionSerializer(serializers.ModelSerializer):
    wallet_id = serializers.PrimaryKeyRelatedField(queryset=Wallet.objects.all(), source="wallet", write_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", write_only=True, required=False, allow_null=True
    )

    wallet = WalletSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    currency = CurrencySerializer(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "type",
            "occurred_at",
            "amount",
            "wallet", "wallet_id",
            "currency",
            "fx_rate",
            "base_amount",
            "category", "category_id",
            "merchant",
            "note",
            "receipt_url",
            "is_deleted",
            "created_at",
        ]
        read_only_fields = ["currency", "fx_rate", "base_amount", "is_deleted", "created_at"]

    def validate_wallet(self, wallet: Wallet):
        request = self.context["request"]
        if wallet.owner_id != request.user.id:
            raise serializers.ValidationError("You do not own this wallet.")
        return wallet

    def validate_category(self, category: Category):
        request = self.context["request"]
        if category and category.owner_id != request.user.id:
            raise serializers.ValidationError("You do not own this category.")
        return category

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        wallet: Wallet = validated_data["wallet"]

        # currency ตาม wallet เสมอ
        tx_currency = wallet.currency
        base_code = user.profile.base_currency
        base_currency = Currency.objects.get(code=base_code)

        occurred_at = validated_data.get("occurred_at") or timezone.now()
        date = occurred_at.date()

        fx = _get_fx_rate(date, tx_currency, base_currency)
        base_amount = (Decimal(validated_data["amount"]) * fx).quantize(Decimal("0.01"))

        tx = Transaction.objects.create(
            owner=user,
            currency=tx_currency,
            fx_rate=fx,
            base_amount=base_amount,
            **validated_data,
        )
        return tx

class BudgetSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Budget
        fields = [
            "id",
            "month",
            "scope",
            "category",
            "category_id",
            "limit_base_amount",
            "alert_80_sent",
            "alert_100_sent",
            "created_at",
        ]
        read_only_fields = ["alert_80_sent", "alert_100_sent", "created_at"]

    def validate(self, attrs):
        request = self.context["request"]
        scope = attrs.get("scope", Budget.Scope.TOTAL)
        category = attrs.get("category")

        # month format check (YYYY-MM)
        month = attrs.get("month")
        if not month or len(month) != 7 or month[4] != "-":
            raise serializers.ValidationError("month must be in format YYYY-MM")

        if scope == Budget.Scope.CATEGORY and not category:
            raise serializers.ValidationError("category_id is required when scope=category")

        if scope == Budget.Scope.TOTAL and category:
            raise serializers.ValidationError("category_id must be null when scope=total")

        # owner check for category
        if category and category.owner_id != request.user.id:
            raise serializers.ValidationError("You do not own this category")

        return attrs
    
class TransferCreateSerializer(serializers.Serializer):
    from_wallet_id = serializers.PrimaryKeyRelatedField(queryset=Wallet.objects.all(), source="from_wallet")
    to_wallet_id = serializers.PrimaryKeyRelatedField(queryset=Wallet.objects.all(), source="to_wallet")

    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    occurred_at = serializers.DateTimeField(required=False)

    note = serializers.CharField(required=False, allow_blank=True, default="")
    merchant = serializers.CharField(required=False, allow_blank=True, default="Transfer")

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user

        from_wallet = attrs["from_wallet"]
        to_wallet = attrs["to_wallet"]

        if from_wallet.owner_id != user.id or to_wallet.owner_id != user.id:
            raise serializers.ValidationError("You must own both wallets.")

        if from_wallet.id == to_wallet.id:
            raise serializers.ValidationError("from_wallet and to_wallet must be different.")

        amt = attrs["amount"]
        if amt <= 0:
            raise serializers.ValidationError("amount must be > 0")

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user

        from_wallet: Wallet = validated_data["from_wallet"]
        to_wallet: Wallet = validated_data["to_wallet"]

        occurred_at = validated_data.get("occurred_at") or timezone.now()
        date = occurred_at.date()

        merchant = validated_data.get("merchant", "Transfer")
        note = validated_data.get("note", "")

        # currency ของแต่ละรายการจะตาม wallet
        from_currency = from_wallet.currency
        to_currency = to_wallet.currency

        base_code = user.profile.base_currency
        base_currency = Currency.objects.get(code=base_code)

        # --- OUT TX ---
        # base_amount ของ out_tx คิดจาก from_currency -> base_currency
        fx_out = _get_fx_rate(date, from_currency, base_currency)
        base_out = (validated_data["amount"] * fx_out).quantize(Decimal("0.01"))

        # --- IN TX ---
        # amount_in: ถ้าสกุลเดียวกัน = amount เดิม
        # ถ้าต่างสกุล: แปลงจาก from_currency -> to_currency
        if from_currency.id == to_currency.id:
            amount_in = validated_data["amount"]
        else:
            fx_from_to = _get_fx_rate(date, from_currency, to_currency)
            amount_in = (validated_data["amount"] * fx_from_to).quantize(Decimal("0.01"))

        # base_amount ของ in_tx คิดจาก to_currency -> base_currency
        fx_in = _get_fx_rate(date, to_currency, base_currency)
        base_in = (amount_in * fx_in).quantize(Decimal("0.01"))

        with db_transaction.atomic():
            out_tx = Transaction.objects.create(
                owner=user,
                wallet=from_wallet,
                type=Transaction.TxType.TRANSFER_OUT,
                occurred_at=occurred_at,
                amount=validated_data["amount"],
                currency=from_currency,
                fx_rate=fx_out,
                base_amount=base_out,
                merchant=merchant,
                note=note,
                category=None,
            )

            in_tx = Transaction.objects.create(
                owner=user,
                wallet=to_wallet,
                type=Transaction.TxType.TRANSFER_IN,
                occurred_at=occurred_at,
                amount=amount_in,
                currency=to_currency,
                fx_rate=fx_in,
                base_amount=base_in,
                merchant=merchant,
                note=note,
                category=None,
            )

            link = TransferLink.objects.create(out_tx=out_tx, in_tx=in_tx)

        return {"out_tx": out_tx, "in_tx": in_tx, "link_id": link.id}