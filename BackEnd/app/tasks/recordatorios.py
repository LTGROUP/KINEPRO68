import asyncio
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select, and_, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.celery_app import celery_app
from app.config import settings
from app.integrations.email.email_service import send_recordatorio_turno, send_confirmacion_turno
from app.models.turno import Turno, EstadoTurno

logger = logging.getLogger(__name__)
ARGENTINA_TZ = ZoneInfo("America/Argentina/Buenos_Aires")


async def _enviar_recordatorios_24hs() -> int:
    engine = create_async_engine(
        settings.database_url,
        connect_args={
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
        },
    )
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        manana = (datetime.now(ARGENTINA_TZ) + timedelta(days=1)).date()
        logger.info("[recordatorios] Buscando turnos RESERVADOS para %s", manana)

        async with session_factory() as db:
            result = await db.execute(
                select(Turno).where(
                    and_(
                        Turno.fecha == manana,
                        Turno.estado == EstadoTurno.RESERVADO,
                    )
                )
            )
            turnos = result.scalars().all()
            logger.info("[recordatorios] %d turno(s) con recordatorio pendiente.", len(turnos))

            enviados = 0
            for turno in turnos:
                email = None
                try:
                    res = await db.execute(
                        text("SELECT email FROM auth.users WHERE id = :pid"),
                        {"pid": str(turno.paciente_id)},
                    )
                    row = res.fetchone()
                    if row:
                        email = row[0]
                except Exception as e:
                    logger.warning(
                        "[recordatorios] No se pudo obtener email para paciente %s: %s",
                        turno.paciente_id, e,
                    )

                if not email:
                    logger.warning(
                        "[recordatorios] Sin email para paciente %s — turno %s %s omitido",
                        turno.paciente_id, turno.fecha, turno.hora_inicio,
                    )
                    continue

                enviado = send_recordatorio_turno(
                    email=email,
                    fecha=turno.fecha,
                    hora_inicio=turno.hora_inicio,
                    hora_fin=turno.hora_fin,
                    area_tratamiento=turno.area_tratamiento,
                )
                if enviado:
                    logger.info(
                        "[recordatorios] Email enviado → %s | Turno %s %s-%s",
                        email, turno.fecha, turno.hora_inicio, turno.hora_fin,
                    )
                    enviados += 1
                else:
                    logger.warning(
                        "[recordatorios] Falló envío → %s | Turno %s %s",
                        email, turno.fecha, turno.hora_inicio,
                    )

        return enviados
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.enviar_recordatorios_24hs")
def enviar_recordatorios_24hs() -> int:
    return asyncio.run(_enviar_recordatorios_24hs())


async def _enviar_confirmacion(
    to_email: str,
    nombre_paciente: str,
    fecha,
    hora_inicio,
    hora_fin,
    area_tratamiento,
) -> bool:
    try:
        enviado = send_confirmacion_turno(
            to_email=to_email,
            nombre_paciente=nombre_paciente,
            fecha=fecha,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
            area_tratamiento=area_tratamiento,
        )
        if enviado:
            logger.info("[confirmacion_turno] Email enviado a %s", to_email)
        else:
            logger.warning("[confirmacion_turno] Falló el envío de confirmación a %s", to_email)
        return enviado
    except Exception:
        logger.exception("[confirmacion_turno] Error inesperado enviando confirmación a %s", to_email)
        return False


@celery_app.task(name="tasks.enviar_confirmacion_turno")
def enviar_confirmacion_turno_task(to_email, nombre_paciente, fecha, hora_inicio, hora_fin, area_tratamiento) -> bool:
    return asyncio.run(
        _enviar_confirmacion(to_email, nombre_paciente, fecha, hora_inicio, hora_fin, area_tratamiento)
    )
