from urllib import response
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import FxRate, Category, Transaction
from .serializers import FxRateSerializer, CategorySerializer, TransactionSerializer, TransferCreateSerializer

class FxRateViewSet(viewsets.ModelViewSet):
    """
    ช่วงแรกให้สร้างเองก่อนใน Swagger
    (อนาคตค่อยทำ job ดึงอัตโนมัติ)
    """
    queryset = FxRate.objects.all().order_by("-date")
    serializer_class = FxRateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["date", "base", "quote"]


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["type", "parent"]

    def get_queryset(self):
        return Category.objects.filter(owner=self.request.user).order_by("type", "name")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["type", "wallet", "category"]

    def get_queryset(self):
        return Transaction.objects.filter(owner=self.request.user, is_deleted=False).order_by("-occurred_at")

    def perform_destroy(self, instance):
        # soft delete
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])

    @action(detail=False, methods=["post"], url_path="transfer")
    def transfer(self, request):
        ser = TransferCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        result = ser.save()
        return response(
            {
                "link_id": result["link_id"],
                "out_tx": TransactionSerializer(result["out_tx"], context={"request": request}).data,
                "in_tx": TransactionSerializer(result["in_tx"], context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )
