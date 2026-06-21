import asyncio
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select, and_, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.celery_app import celery_app
from app.config import settings
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

                area_str = turno.area_tratamiento.value if turno.area_tratamiento else "Sin especificar"
                cuerpo = (
                    f"Hola,\n\n"
                    f"Te recordamos que tenés turno mañana {turno.fecha} "
                    f"de {turno.hora_inicio} a {turno.hora_fin}.\n"
                    f"Área: {area_str}.\n\n"
                    f"KinePro"
                )

                if email:
                    logger.info(
                        "[recordatorios] MAIL → %s | Turno %s %s-%s",
                        email, turno.fecha, turno.hora_inicio, turno.hora_fin,
                    )
                else:
                    logger.info(
                        "[recordatorios] MAIL (sin email) → paciente %s | Turno %s %s-%s",
                        turno.paciente_id, turno.fecha, turno.hora_inicio, turno.hora_fin,
                    )

                print(
                    f"[RECORDATORIO] paciente={turno.paciente_id} "
                    f"email={email} turno={turno.fecha} {turno.hora_inicio}\n{cuerpo}"
                )
                enviados += 1

        return enviados
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.enviar_recordatorios_24hs")
def enviar_recordatorios_24hs() -> int:
    return asyncio.run(_enviar_recordatorios_24hs())
