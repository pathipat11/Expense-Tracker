from rest_framework import serializers
from .models import Receipt

class ReceiptUploadSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Receipt
        fields = ["id", "file", "file_url", "created_at"]
        read_only_fields = ["id", "file_url", "created_at"]

    def get_file_url(self, obj: Receipt):
        if not obj.file:
            return None
        url = obj.file.url
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url

    def validate_file(self, f):
        max_size = 5 * 1024 * 1024
        if f.size > max_size:
            raise serializers.ValidationError("File too large. Max 5MB.")
        return f