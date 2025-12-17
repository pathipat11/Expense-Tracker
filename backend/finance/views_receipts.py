from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers

from .serializers_receipts import ReceiptUploadSerializer


class ReceiptUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        tags=["receipts"],
        request=inline_serializer(
            name="ReceiptUploadRequest",
            fields={
                "file": serializers.FileField(),
            },
        ),
        responses={
            201: inline_serializer(
                name="ReceiptUploadResponse",
                fields={
                    "id": serializers.IntegerField(),
                    "file": serializers.CharField(),
                    "file_url": serializers.CharField(),
                    "created_at": serializers.DateTimeField(),
                },
            )
        },
    )
    def post(self, request):
        # ✅ validate + create ผ่าน serializer
        ser = ReceiptUploadSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)

        receipt = ser.save(owner=request.user)

        # ✅ serialize กลับ (มี file_url absolute)
        out = ReceiptUploadSerializer(receipt, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)
