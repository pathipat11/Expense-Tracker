from rest_framework import serializers
from django.utils import timezone
from .models import RecurringTransaction, Wallet, Category, Transaction

class RecurringTransactionSerializer(serializers.ModelSerializer):
    wallet_id = serializers.PrimaryKeyRelatedField(queryset=Wallet.objects.all(), source="wallet", write_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category",
        write_only=True, required=False, allow_null=True
    )

    wallet = serializers.StringRelatedField(read_only=True)
    category = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = RecurringTransaction
        fields = [
            "id",
            "type",
            "amount",
            "wallet", "wallet_id",
            "category", "category_id",
            "merchant",
            "note",
            "frequency",
            "interval",
            "start_date",
            "next_run_at",
            "end_date",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate(self, attrs):
        req = self.context["request"]
        user = req.user

        wallet = attrs.get("wallet")
        if wallet and wallet.owner_id != user.id:
            raise serializers.ValidationError("You do not own this wallet")

        category = attrs.get("category")
        if category and category.owner_id != user.id:
            raise serializers.ValidationError("You do not own this category")

        tx_type = attrs.get("type")
        if tx_type not in (Transaction.TxType.EXPENSE, Transaction.TxType.INCOME):
            raise serializers.ValidationError("type must be expense or income")

        interval = attrs.get("interval", 1)
        if interval <= 0:
            raise serializers.ValidationError("interval must be >= 1")

        # ถ้าไม่ส่ง next_run_at มา ให้เริ่มจาก start_date เวลา 09:00
        if not attrs.get("next_run_at") and attrs.get("start_date"):
            start_date = attrs["start_date"]
            attrs["next_run_at"] = timezone.make_aware(
                timezone.datetime.combine(start_date, timezone.datetime.min.time().replace(hour=9))
            )

        return attrs
