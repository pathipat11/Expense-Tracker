from django.conf import settings
from django.db import models

class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    base_currency = models.CharField(max_length=3, default="THB")
    timezone = models.CharField(max_length=64, default="Asia/Bangkok")
    language = models.CharField(max_length=10, default="th")

    def __str__(self):
        return f"{self.user.username} profile"
