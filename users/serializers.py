from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import UserProfile

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    base_currency = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ["username", "email", "password", "base_currency"]

    def create(self, validated_data):
        base_currency = validated_data.pop("base_currency", "THB")
        user = User.objects.create_user(**validated_data)
        user.profile.base_currency = base_currency
        user.profile.save()
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["base_currency", "timezone", "language"]

class MeSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()

    class Meta:
        model = User
        fields = ["id", "username", "email", "profile"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()

        profile = instance.profile
        for k, v in profile_data.items():
            setattr(profile, k, v)
        profile.save()

        return instance
