from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiParameter
from rest_framework import serializers
from django.conf import settings

from .models import AiInsight
from .services_ai import generate_monthly_summary


class AiMonthlySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["ai"],
        request=inline_serializer(
            name="AiMonthlySummaryRequest",
            fields={
                "month": serializers.CharField(help_text="YYYY-MM"),
                "language": serializers.ChoiceField(choices=["th", "en"], required=False),
            },
        ),
        responses={200: inline_serializer(
            name="AiMonthlySummaryResponse",
            fields={
                "month": serializers.CharField(),
                "language": serializers.CharField(),
                "content": serializers.CharField(),
                "meta": serializers.DictField(),
            },
        )}
    )
    def post(self, request):
        # if not settings.OPENAI_API_KEY:
        #     return Response(
        #         {"detail": "OPENAI_API_KEY is not configured"},
        #         status=status.HTTP_500_INTERNAL_SERVER_ERROR
        #     )

        month = request.data.get("month")
        language = request.data.get("language", "th")

        if not month or len(month) != 7 or month[4] != "-":
            return Response({"detail": "month must be YYYY-MM"}, status=400)

        insight = generate_monthly_summary(request.user, month, language=language)
        return Response({
            "month": insight.month,
            "language": insight.language,
            "content": insight.content,
            "meta": insight.meta,
        })

    @extend_schema(
        tags=["ai"],
        parameters=[
            OpenApiParameter("month", str, required=True, description="YYYY-MM"),
            OpenApiParameter("language", str, required=False, description="th|en"),
        ],
        responses={200: dict},
    )
    def get(self, request):
        month = request.query_params.get("month")
        language = request.query_params.get("language", "th")

        if not month:
            return Response({"detail": "month is required"}, status=400)

        q = AiInsight.objects.filter(
            owner=request.user,
            month=month,
            kind=AiInsight.Kind.MONTHLY_SUMMARY,
            language=language
        ).first()

        if not q:
            return Response({"detail": "Not found. Generate via POST first."}, status=404)

        return Response({
            "month": q.month,
            "language": q.language,
            "content": q.content,
            "meta": q.meta,
            "created_at": q.created_at.isoformat(),
        })
