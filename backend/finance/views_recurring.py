from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import RecurringTransaction
from .serializers_recurring import RecurringTransactionSerializer

class RecurringTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = RecurringTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RecurringTransaction.objects.filter(owner=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
