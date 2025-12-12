from django.urls import path
from .views_budgets import BudgetStatusView

urlpatterns = [
    path("budgets/status/", BudgetStatusView.as_view()),
]
