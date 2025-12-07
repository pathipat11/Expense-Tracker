from django.urls import path
from .views_reports import (
    ReportSummaryView,
    ReportByCategoryView,
    ReportTrendView,
    ReportTopMerchantsView,
    ReportWalletBalancesView,
)

urlpatterns = [
    path("reports/summary/", ReportSummaryView.as_view()),
    path("reports/by-category/", ReportByCategoryView.as_view()),
    path("reports/trend/", ReportTrendView.as_view()),
    path("reports/top-merchants/", ReportTopMerchantsView.as_view()),
    path("reports/wallet-balances/", ReportWalletBalancesView.as_view()),
]
