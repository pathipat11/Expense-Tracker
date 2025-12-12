from celery import shared_task
from finance.services_recurring import run_due

@shared_task
def run_recurrings_task():
    return run_due()
