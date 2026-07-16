import os
import socket
from urllib.parse import urlparse
from celery import Celery
from celery.schedules import crontab

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")


def redis_disponible(timeout: float = 0.5) -> bool:
    """Chequeo rápido de conectividad TCP a Redis.

    Se usa antes de llamar `.delay()`/`.apply_async()` en request/response
    paths: si Redis no responde, Celery reintenta la conexión con backoff y
    puede tardar 100+ segundos antes de lanzar la excepción que dispararía el
    fallback. Este chequeo evita ese costo casi por completo (falla en como
    mucho `timeout` segundos en vez de minutos).
    """
    parsed = urlparse(REDIS_URL)
    host = parsed.hostname or "localhost"
    port = parsed.port or 6379

    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


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
