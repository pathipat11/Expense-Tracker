from django.core.management.base import BaseCommand
from finance.models import Currency

class Command(BaseCommand):
    help = "Seed common currencies"

    def handle(self, *args, **options):
        data = [
            ("THB", "Thai Baht", "฿"),
            ("USD", "US Dollar", "$"),
            ("EUR", "Euro", "€"),
            ("JPY", "Japanese Yen", "¥"),
            ("GBP", "British Pound", "£"),
        ]
        for code, name, symbol in data:
            Currency.objects.update_or_create(code=code, defaults={"name": name, "symbol": symbol})
        self.stdout.write(self.style.SUCCESS("Seeded currencies ✅"))