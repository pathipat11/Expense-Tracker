from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

from drf_spectacular.utils import extend_schema, inline_serializer
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers

from .models import Receipt


class ReceiptUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        tags=["receipts"],
        request=inline_serializer(
            name="ReceiptUploadRequest",
            fields={
                "file": serializers.FileField(),  # สำคัญ: ให้ swagger เป็น file picker
            },
        ),
        responses={200: inline_serializer(
            name="ReceiptUploadResponse",
            fields={
                "id": serializers.IntegerField(),
                "receipt_url": serializers.CharField(),
            },
        )},
    )
    def post(self, request):
        f = request.FILES.get("file")
        if not f:
            return Response({"detail": "file is required"}, status=status.HTTP_400_BAD_REQUEST)

        receipt = Receipt.objects.create(owner=request.user, file=f)
        url = request.build_absolute_uri(receipt.file.url)

        return Response({"id": receipt.id, "receipt_url": url}, status=status.HTTP_200_OK)
