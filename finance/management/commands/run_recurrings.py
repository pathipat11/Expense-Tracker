from django.core.management.base import BaseCommand
from finance.services_recurring import run_due

class Command(BaseCommand):
    help = "Run due recurring transactions"

    def handle(self, *args, **options):
        created = run_due()
        self.stdout.write(self.style.SUCCESS(f"Created {created} transactions ✅"))
