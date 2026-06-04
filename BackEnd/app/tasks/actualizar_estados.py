import asyncio
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.celery_app import celery_app
from app.config import settings
from app.models.turno import Turno, EstadoTurno

logger = logging.getLogger(__name__)

ARGENTINA_TZ = ZoneInfo("America/Argentina/Buenos_Aires")


async def _run_actualizar_ausentes() -> int:
    engine = create_async_engine(
        settings.database_url,
        connect_args={
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
        },
    )
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        ahora_argentina = datetime.now(ARGENTINA_TZ).replace(tzinfo=None)
        # Un turno es AUSENTE recién 30 minutos después de su hora_fin
        umbral = ahora_argentina - timedelta(minutes=30)
        umbral_fecha = umbral.date()
        umbral_hora = umbral.time()

        print(f"[TASK] Buscando turnos RESERVADOS vencidos a las {ahora_argentina}")

        async with session_factory() as db:
            result = await db.execute(
                select(Turno).where(
                    and_(
                        Turno.estado == EstadoTurno.RESERVADO,
                        or_(
                            Turno.fecha < umbral_fecha,
                            and_(
                                Turno.fecha == umbral_fecha,
                                Turno.hora_fin < umbral_hora,
                            ),
                        ),
                    )
                )
            )
            turnos = result.scalars().all()

            print(f"[TASK] Encontrados {len(turnos)} turnos para marcar AUSENTE")

            for turno in turnos:
                turno.estado = EstadoTurno.AUSENTE
                print(f"[TASK] Turno {turno.id} — {turno.fecha} {turno.hora_fin} → AUSENTE")

            if turnos:
                await db.commit()
                print(f"[TASK] Commit exitoso: {len(turnos)} turnos actualizados")

            logger.info("[actualizar_ausentes] %d turno(s) marcados como AUSENTE", len(turnos))
            return len(turnos)
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.actualizar_ausentes")
def actualizar_ausentes() -> int:
    return asyncio.run(_run_actualizar_ausentes())
