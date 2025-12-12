from decimal import Decimal
from django.db.models import Sum
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import Budget, Transaction, Category
from .serializers import BudgetSerializer

class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Budget.objects.filter(owner=self.request.user).order_by("-month", "scope")
        month = self.request.query_params.get("month")
        if month:
            qs = qs.filter(month=month)
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_destroy(self, instance):
        instance.delete()


class BudgetStatusView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["budgets"],
        parameters=[
            OpenApiParameter("month", str, required=True, description="YYYY-MM"),
        ],
        responses={200: dict},
    )
    def get(self, request):
        month = request.query_params.get("month")
        if not month or len(month) != 7 or month[4] != "-":
            return Response({"detail": "month is required (YYYY-MM)"}, status=400)

        # ช่วงวันที่ของเดือน (ใช้ occurred_at__date__startswith)
        # ง่ายและพอสำหรับ MVP
        tx_qs = Transaction.objects.filter(
            owner=request.user,
            is_deleted=False,
            occurred_at__date__startswith=month,
        )

        base_currency = request.user.profile.base_currency

        budgets = Budget.objects.filter(owner=request.user, month=month).select_related("category")

        items = []
        for b in budgets:
            if b.scope == Budget.Scope.TOTAL:
                spent = tx_qs.filter(type="expense").aggregate(s=Sum("base_amount"))["s"] or Decimal("0")
                title = "Total Budget"
            else:
                spent = tx_qs.filter(type="expense", category=b.category).aggregate(s=Sum("base_amount"))["s"] or Decimal("0")
                title = f"Category: {b.category.name}"

            limit_amt = b.limit_base_amount
            remaining = limit_amt - spent
            percent = (spent / limit_amt * Decimal("100")) if limit_amt > 0 else Decimal("0")

            items.append({
                "budget_id": b.id,
                "title": title,
                "scope": b.scope,
                "category_id": b.category.id if b.category else None,
                "limit": str(limit_amt),
                "spent": str(spent),
                "remaining": str(remaining),
                "percent_used": str(percent.quantize(Decimal("0.01"))),
                "alert_80_sent": b.alert_80_sent,
                "alert_100_sent": b.alert_100_sent,
            })

        return Response({
            "month": month,
            "base_currency": base_currency,
            "items": items,
        })
