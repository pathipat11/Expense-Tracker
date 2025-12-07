from datetime import timedelta
from decimal import Decimal
from django.db import transaction as db_transaction
from django.utils import timezone

from .models import RecurringTransaction, Transaction, Currency
from .serializers import _get_fx_rate  # helper เดิมสำหรับ FX


def _add_months(dt, months: int):
    # เพิ่มเดือนแบบง่าย (พอสำหรับ MVP)
    year = dt.year + (dt.month - 1 + months) // 12
    month = (dt.month - 1 + months) % 12 + 1
    day = min(dt.day, 28)  # กันปัญหาวัน 29-31
    return dt.replace(year=year, month=month, day=day)


def compute_next_run_at(rt: RecurringTransaction, current: timezone.datetime):
    if rt.frequency == RecurringTransaction.Frequency.DAILY:
        return current + timedelta(days=rt.interval)
    if rt.frequency == RecurringTransaction.Frequency.WEEKLY:
        return current + timedelta(weeks=rt.interval)
    if rt.frequency == RecurringTransaction.Frequency.MONTHLY:
        return _add_months(current, rt.interval)
    return current + timedelta(days=rt.interval)


def create_transaction_from_recurring(rt: RecurringTransaction, occurred_at: timezone.datetime):
    user = rt.owner
    wallet = rt.wallet
    tx_currency = wallet.currency
    base_currency = Currency.objects.get(code=user.profile.base_currency)
    date = occurred_at.date()

    fx = _get_fx_rate(date, tx_currency, base_currency)
    base_amount = (Decimal(rt.amount) * fx).quantize(Decimal("0.01"))

    return Transaction.objects.create(
        owner=user,
        wallet=wallet,
        type=rt.type,
        occurred_at=occurred_at,
        amount=rt.amount,
        currency=tx_currency,
        fx_rate=fx,
        base_amount=base_amount,
        category=rt.category,
        merchant=rt.merchant,
        note=rt.note,
    )


def run_due(now=None):
    """
    รันรายการที่ถึงเวลา (next_run_at <= now) แล้วสร้าง Transaction
    """
    now = now or timezone.now()

    qs = RecurringTransaction.objects.filter(is_active=True, next_run_at__lte=now).select_related(
        "owner", "wallet", "wallet__currency", "category"
    )

    created = 0
    with db_transaction.atomic():
        for rt in qs:
            # ถ้ามี end_date และเลยแล้ว -> ปิด
            if rt.end_date and rt.next_run_at.date() > rt.end_date:
                rt.is_active = False
                rt.save(update_fields=["is_active"])
                continue

            # สร้าง tx
            create_transaction_from_recurring(rt, rt.next_run_at)
            created += 1

            # อัปเดตรอบถัดไป
            rt.next_run_at = compute_next_run_at(rt, rt.next_run_at)
            rt.save(update_fields=["next_run_at"])

    return created
