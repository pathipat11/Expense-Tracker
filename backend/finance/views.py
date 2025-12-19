from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q

from .models import Currency, Wallet
from .serializers import CurrencySerializer, WalletSerializer


class CurrencyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Currency.objects.all().order_by("code")
    serializer_class = CurrencySerializer
    permission_classes = [IsAuthenticated]


class WalletViewSet(viewsets.ModelViewSet):
    serializer_class = WalletSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Wallet.objects
            .filter(owner=self.request.user)
            .select_related("currency")
            .annotate(
                tx_count=Count("transactions", filter=Q(transactions__is_deleted=False))
            )
            .order_by("-is_active", "name")
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
