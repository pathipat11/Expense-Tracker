from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from datetime import date

from openai import OpenAI
from django.conf import settings

from .models import Transaction, AiInsight


def month_range(month: str):
    # month: "YYYY-MM"
    y = int(month[:4])
    m = int(month[5:7])
    start = date(y, m, 1)
    if m == 12:
        end = date(y + 1, 1, 1)
    else:
        end = date(y, m + 1, 1)
    return start, end  # [start, end)


def build_monthly_stats(user, month: str):
    start, end = month_range(month)

    qs = Transaction.objects.filter(
        owner=user,
        is_deleted=False,
        occurred_at__date__gte=start,
        occurred_at__date__lt=end,
    )

    income = qs.filter(type="income").aggregate(s=Sum("base_amount"))["s"] or Decimal("0")
    expense = qs.filter(type="expense").aggregate(s=Sum("base_amount"))["s"] or Decimal("0")
    net = income - expense

    # top categories (expense)
    by_cat = (
        qs.filter(type="expense")
        .values("category__name")
        .annotate(total=Sum("base_amount"))
        .order_by("-total")[:5]
    )
    top_categories = [
        {"category": r["category__name"] or "Uncategorized", "total": str(r["total"] or 0)}
        for r in by_cat
    ]

    # top merchants (expense)
    by_mer = (
        qs.filter(type="expense")
        .exclude(merchant="")
        .values("merchant")
        .annotate(total=Sum("base_amount"))
        .order_by("-total")[:5]
    )
    top_merchants = [{"merchant": r["merchant"], "total": str(r["total"] or 0)} for r in by_mer]

    # count
    count = qs.count()

    return {
        "month": month,
        "base_currency": user.profile.base_currency,
        "income": str(income),
        "expense": str(expense),
        "net": str(net),
        "transaction_count": count,
        "top_categories": top_categories,
        "top_merchants": top_merchants,
    }


def ai_monthly_summary_text(stats: dict, language: str = "th"):
    """
    เรียก OpenAI ให้เขียน summary จากตัวเลขจริง
    """
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")

    if language not in ("th", "en"):
        language = "th"

    system = (
        "You are a helpful personal finance analyst. "
        "Write concise, actionable monthly spending insights based ONLY on provided data. "
        "Do not invent numbers. If a value is missing, say you don't have data."
    )

    if language == "th":
        user_prompt = f"""
สรุปการเงินรายเดือนแบบกระชับและใช้ได้จริง (ภาษาไทย) จากข้อมูลนี้เท่านั้น:
ข้อมูล (JSON):
{stats}

รูปแบบที่ต้องการ:
- ภาพรวม 3 บรรทัด (รายรับ/รายจ่าย/คงเหลือ)
- หมวดที่ใช้เยอะสุด 3 อันดับ (พร้อมตัวเลข)
- ร้านค้าที่ใช้เยอะสุด 3 อันดับ (พร้อมตัวเลข) ถ้ามี
- ข้อแนะนำ 3 ข้อที่ทำได้จริงเดือนหน้า
"""
    else:
        user_prompt = f"""
Write a concise monthly finance summary (English) using ONLY this data:
JSON:
{stats}

Format:
- 3-line overview (income/expense/net)
- Top 3 spending categories (with numbers)
- Top 3 merchants (with numbers) if available
- 3 actionable recommendations for next month
"""

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
    )

    return resp.choices[0].message.content.strip()


def generate_monthly_summary(user, month: str, language: str = "th"):
    stats = build_monthly_stats(user, month)

    try:
        text = ai_monthly_summary_text(stats, language=language)
        used_provider = "openai"
    except Exception:
        text = template_monthly_summary(stats, language=language)
        used_provider = "template"

    insight, _ = AiInsight.objects.update_or_create(
        owner=user,
        month=month,
        kind=AiInsight.Kind.MONTHLY_SUMMARY,
        language=language,
        defaults={"content": text, "meta": {**stats, "provider": used_provider}},
    )
    return insight


def template_monthly_summary(stats: dict, language: str = "th") -> str:
    bc = stats["base_currency"]
    income = stats["income"]
    expense = stats["expense"]
    net = stats["net"]

    top_cats = stats.get("top_categories", [])[:3]
    top_mers = stats.get("top_merchants", [])[:3]

    if language == "en":
        lines = [
            f"Monthly overview ({stats['month']}) in {bc}:",
            f"- Income: {income} {bc}",
            f"- Expense: {expense} {bc}",
            f"- Net: {net} {bc}",
            "",
            "Top spending categories:",
        ]
        if top_cats:
            for i, c in enumerate(top_cats, 1):
                lines.append(f"{i}) {c['category']}: {c['total']} {bc}")
        else:
            lines.append("- No category data")

        lines.append("")
        lines.append("Top merchants:")
        if top_mers:
            for i, m in enumerate(top_mers, 1):
                lines.append(f"{i}) {m['merchant']}: {m['total']} {bc}")
        else:
            lines.append("- No merchant data")

        lines += [
            "",
            "Recommendations:",
            "1) Set a budget for your top category and track weekly.",
            "2) Review recurring subscriptions and cancel unused ones.",
            "3) Add notes/receipts to large transactions to understand patterns.",
        ]
        return "\n".join(lines)

    # TH
    lines = [
        f"สรุปรายเดือน ({stats['month']}) หน่วย {bc}:",
        f"- รายรับ: {income} {bc}",
        f"- รายจ่าย: {expense} {bc}",
        f"- คงเหลือสุทธิ: {net} {bc}",
        "",
        "หมวดที่ใช้จ่ายสูงสุด:",
    ]
    if top_cats:
        for i, c in enumerate(top_cats, 1):
            lines.append(f"{i}) {c['category']}: {c['total']} {bc}")
    else:
        lines.append("- ยังไม่มีข้อมูลหมวดหมู่")

    lines.append("")
    lines.append("ร้านค้าที่ใช้จ่ายสูงสุด:")
    if top_mers:
        for i, m in enumerate(top_mers, 1):
            lines.append(f"{i}) {m['merchant']}: {m['total']} {bc}")
    else:
        lines.append("- ยังไม่มีข้อมูลร้านค้า")

    lines += [
        "",
        "คำแนะนำเดือนหน้า:",
        "1) ตั้งงบหมวดที่ใช้เยอะสุด และเช็คทุกสัปดาห์",
        "2) ตรวจสอบค่าใช้จ่ายประจำ (subscription) แล้วตัดอันที่ไม่จำเป็น",
        "3) แนบใบเสร็จ/เขียนโน้ตในรายการใหญ่ ๆ เพื่อวิเคราะห์ได้ดีขึ้น",
    ]
    return "\n".join(lines)
