from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Currency, Wallet
from .serializers import CurrencySerializer, WalletSerializer

class CurrencyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ให้ FE ใช้ list currency ได้ (อ่านอย่างเดียว)
    """
    queryset = Currency.objects.all().order_by("code")
    serializer_class = CurrencySerializer
    permission_classes = [IsAuthenticated]

class WalletViewSet(viewsets.ModelViewSet):
    serializer_class = WalletSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Wallet.objects.filter(owner=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
