import os
from celery import Celery
from celery.schedules import crontab

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "kinepro",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "app.tasks.actualizar_estados",
        "app.tasks.lista_espera",
        "app.tasks.recordatorios",
    ],
)

celery_app.conf.beat_schedule = {
    "actualizar-ausentes-cada-10-min": {
        "task": "tasks.actualizar_ausentes",
        "schedule": 600,  # cada 10 minutos
    },
    "recordatorios-diarios": {
        "task": "tasks.enviar_recordatorios_24hs",
        "schedule": crontab(hour=10, minute=0),
    },
}

celery_app.conf.timezone = "America/Argentina/Buenos_Aires"
