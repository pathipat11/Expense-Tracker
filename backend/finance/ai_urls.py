from django.urls import path
from .views_ai import AiMonthlySummaryView

urlpatterns = [
    path("ai/monthly-summary/", AiMonthlySummaryView.as_view()),
]
