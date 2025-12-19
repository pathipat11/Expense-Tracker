from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

class Currency(models.Model):
    """
    เก็บสกุลเงินที่รองรับ เช่น THB, USD, EUR
    """
    code = models.CharField(max_length=3, unique=True)  # ISO 4217
    name = models.CharField(max_length=64, blank=True, default="")
    symbol = models.CharField(max_length=8, blank=True, default="")

    def __str__(self):
        return self.code


class Wallet(models.Model):
    class WalletType(models.TextChoices):
        CASH = "cash", "Cash"
        BANK = "bank", "Bank"
        CREDIT = "credit", "Credit Card"
        EWALLET = "ewallet", "E-Wallet"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wallets")
    name = models.CharField(max_length=80)
    type = models.CharField(max_length=10, choices=WalletType.choices, default=WalletType.CASH)

    currency = models.ForeignKey(Currency, on_delete=models.PROTECT, related_name="wallets")
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("owner", "name")]

    def __str__(self):
        return f"{self.owner.username} - {self.name} ({self.currency.code})"

class FxRate(models.Model):
    """
    อัตราแลกเปลี่ยนรายวัน
    ความหมาย: 1 unit ของ base = rate unit ของ quote
    เช่น base=USD quote=THB rate=35.50  => 1 USD = 35.50 THB
    """
    date = models.DateField()
    base = models.ForeignKey(Currency, on_delete=models.PROTECT, related_name="fx_base_rates")
    quote = models.ForeignKey(Currency, on_delete=models.PROTECT, related_name="fx_quote_rates")
    rate = models.DecimalField(max_digits=18, decimal_places=8, validators=[MinValueValidator(Decimal("0.00000001"))])

    class Meta:
        unique_together = [("date", "base", "quote")]
        indexes = [
            models.Index(fields=["date", "base", "quote"]),
        ]

    def __str__(self):
        return f"{self.date} 1 {self.base.code} = {self.rate} {self.quote.code}"


class Category(models.Model):
    class CategoryType(models.TextChoices):
        EXPENSE = "expense", "Expense"
        INCOME = "income", "Income"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="categories")
    type = models.CharField(max_length=10, choices=CategoryType.choices)
    name = models.CharField(max_length=60)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="children")

    class Meta:
        unique_together = [("owner", "type", "name")]
        indexes = [models.Index(fields=["owner", "type"])]

    def __str__(self):
        return f"{self.owner.username} - {self.type}:{self.name}"


class Transaction(models.Model):
    class TxType(models.TextChoices):
        EXPENSE = "expense", "Expense"
        INCOME = "income", "Income"
        TRANSFER_OUT = "transfer_out", "Transfer Out"
        TRANSFER_IN = "transfer_in", "Transfer In"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    wallet = models.ForeignKey(Wallet, on_delete=models.PROTECT, related_name="transactions")
    type = models.CharField(max_length=20, choices=TxType.choices)

    occurred_at = models.DateTimeField()
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])

    # currency ของ transaction จะตาม wallet เสมอ (ลดความซับซ้อน)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT, related_name="transactions")

    # แปลงเป็น base currency ของ user
    fx_rate = models.DecimalField(max_digits=18, decimal_places=8, default=Decimal("1.0"))
    base_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="transactions")
    merchant = models.CharField(max_length=120, blank=True, default="")
    note = models.TextField(blank=True, default="")
    receipt_url = models.CharField(max_length=500, blank=True, default="")

    receipt_file = models.ImageField(upload_to="receipts/%Y/%m/", null=True, blank=True)

    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["owner", "occurred_at"]),
            models.Index(fields=["owner", "type"]),
            models.Index(fields=["owner", "is_deleted"]),
        ]

    def __str__(self):
        return f"{self.owner.username} {self.type} {self.amount} {self.currency.code}"
    
class Budget(models.Model):
    class Scope(models.TextChoices):
        TOTAL = "total", "Total"
        CATEGORY = "category", "Category"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="budgets")
    month = models.CharField(max_length=7)  # "YYYY-MM"
    scope = models.CharField(max_length=10, choices=Scope.choices, default=Scope.TOTAL)

    category = models.ForeignKey("finance.Category", null=True, blank=True, on_delete=models.SET_NULL)

    # เก็บเป็น base currency ของ user
    limit_base_amount = models.DecimalField(
        max_digits=14, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))]
    )

    alert_80_sent = models.BooleanField(default=False)
    alert_100_sent = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("owner", "month", "scope", "category")]
        indexes = [
            models.Index(fields=["owner", "month"]),
            models.Index(fields=["owner", "month", "scope"]),
        ]

    def __str__(self):
        extra = f" ({self.category.name})" if self.scope == "category" and self.category else ""
        return f"{self.owner.username} {self.month} {self.scope}{extra}"
        
class TransferLink(models.Model):
    out_tx = models.OneToOneField("finance.Transaction", on_delete=models.CASCADE, related_name="transfer_out_link")
    in_tx = models.OneToOneField("finance.Transaction", on_delete=models.CASCADE, related_name="transfer_in_link")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transfer {self.out_tx_id} -> {self.in_tx_id}"

class Receipt(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="receipts")
    file = models.ImageField(upload_to="receipts/%Y/%m/")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Receipt {self.id} by {self.owner.username}"

class RecurringTransaction(models.Model):
    class Frequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recurrings")
    wallet = models.ForeignKey("finance.Wallet", on_delete=models.PROTECT)
    category = models.ForeignKey("finance.Category", null=True, blank=True, on_delete=models.SET_NULL)

    # จะสร้างเป็น expense หรือ income
    type = models.CharField(max_length=20, choices=Transaction.TxType.choices)

    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])

    merchant = models.CharField(max_length=120, blank=True, default="")
    note = models.TextField(blank=True, default="")

    frequency = models.CharField(max_length=10, choices=Frequency.choices, default=Frequency.MONTHLY)
    interval = models.PositiveIntegerField(default=1)  # ทุกกี่วัน/กี่สัปดาห์/กี่เดือน

    start_date = models.DateField()
    next_run_at = models.DateTimeField()  # รอบถัดไปที่จะยิง
    end_date = models.DateField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.owner.username} {self.type} {self.amount} {self.frequency}/{self.interval}"
    
class AiInsight(models.Model):
    class Kind(models.TextChoices):
        MONTHLY_SUMMARY = "monthly_summary", "Monthly Summary"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ai_insights")
    month = models.CharField(max_length=7)  # YYYY-MM
    kind = models.CharField(max_length=30, choices=Kind.choices, default=Kind.MONTHLY_SUMMARY)

    language = models.CharField(max_length=10, default="th")  # th/en
    content = models.TextField()  # ข้อความสรุปจาก AI
    meta = models.JSONField(default=dict, blank=True)  # เก็บตัวเลขที่ส่งให้ AI

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("owner", "month", "kind", "language")]
        indexes = [models.Index(fields=["owner", "month", "kind"])]

    def __str__(self):
        return f"{self.owner.username} {self.month} {self.kind} ({self.language})"
