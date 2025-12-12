from rest_framework.routers import DefaultRouter
from .views import CurrencyViewSet, WalletViewSet
from .views_transactions import FxRateViewSet, CategoryViewSet, TransactionViewSet
from .views_budgets import BudgetViewSet
from .views_recurring import RecurringTransactionViewSet


router = DefaultRouter()
router.register("currencies", CurrencyViewSet, basename="currencies")
router.register("wallets", WalletViewSet, basename="wallets")

router.register("fx-rates", FxRateViewSet, basename="fx-rates")
router.register("categories", CategoryViewSet, basename="categories")
router.register("transactions", TransactionViewSet, basename="transactions")

router.register("budgets", BudgetViewSet, basename="budgets")

router.register("recurrings", RecurringTransactionViewSet, basename="recurrings")


urlpatterns = router.urls
