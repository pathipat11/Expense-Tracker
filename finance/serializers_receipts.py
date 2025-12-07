from rest_framework import serializers
from .models import Receipt

class ReceiptUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = ["id", "file", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_file(self, f):
        max_size = 5 * 1024 * 1024
        if f.size > max_size:
            raise serializers.ValidationError("File too large. Max 5MB.")
        return f
