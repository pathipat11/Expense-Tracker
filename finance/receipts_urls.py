from django.urls import path
from .views_receipts import ReceiptUploadView

urlpatterns = [
    path("receipts/upload/", ReceiptUploadView.as_view()),
]
