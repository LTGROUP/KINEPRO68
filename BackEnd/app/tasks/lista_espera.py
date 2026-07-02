import asyncio
import logging
from datetime import datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from jose import jwt
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.celery_app import celery_app
from app.config import settings
from app.integrations.email.email_service import send_oferta_turno_lista_espera
from app.models.turno import Turno, EstadoTurno, ListaEspera

logger = logging.getLogger(__name__)
ARGENTINA_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
TOKEN_ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 4


def _make_session_factory():
    engine = create_async_engine(
        settings.database_url,
        connect_args={
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
        },
    )
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return engine, session_factory


async def _ofertar_turno_lista_espera(turno_id: str) -> bool:
    engine, session_factory = _make_session_factory()
    try:
        async with session_factory() as db:
            # Verificar que el turno siga disponible
            result_turno = await db.execute(
                select(Turno).where(Turno.id == UUID(turno_id))
            )
            turno = result_turno.scalar_one_or_none()
            if not turno or turno.estado != EstadoTurno.DISPONIBLE:
                logger.info("[lista_espera] Turno %s ya no está disponible. No se oferta.", turno_id)
                return False

            # Buscar primer inscripto activo (FIFO)
            result = await db.execute(
                select(ListaEspera).where(
                    and_(
                        ListaEspera.turno_id == UUID(turno_id),
                        ListaEspera.activo == True,
                    )
                ).order_by(ListaEspera.fecha_inscripcion).limit(1)
            )
            inscripcion = result.scalar_one_or_none()

            if not inscripcion:
                logger.info("[lista_espera] Sin inscriptos en espera para turno %s.", turno_id)
                return False

            inscripcion_id_str = str(inscripcion.id)
            paciente_id_str = str(inscripcion.paciente_id)

            # Generar token JWT con expiración de 4hs
            expiry = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS)
            payload = {
                "turno_id": turno_id,
                "inscripcion_id": inscripcion_id_str,
                "paciente_id": paciente_id_str,
                "exp": expiry,
            }
            token = jwt.encode(payload, settings.supabase_jwt_secret, algorithm=TOKEN_ALGORITHM)

            link = f"{settings.app_login_url}aceptar-turno?token={token}"

            # Obtener email del paciente desde auth.users
            email_paciente = None
            try:
                from sqlalchemy import text as sa_text
                res_email = await db.execute(
                    sa_text("SELECT email FROM auth.users WHERE id = :pid"),
                    {"pid": paciente_id_str},
                )
                row = res_email.fetchone()
                if row:
                    email_paciente = row[0]
            except Exception as e:
                logger.warning("[lista_espera] No se pudo obtener email para paciente %s: %s", paciente_id_str, e)

            if email_paciente:
                enviado = send_oferta_turno_lista_espera(
                    email=email_paciente,
                    fecha=turno.fecha,
                    hora_inicio=turno.hora_inicio,
                    hora_fin=turno.hora_fin,
                    area_tratamiento=turno.area_tratamiento,
                    link=link,
                )
                if enviado:
                    logger.info(
                        "[lista_espera] Email de oferta enviado → %s | Turno %s %s-%s",
                        email_paciente, turno.fecha, turno.hora_inicio, turno.hora_fin,
                    )
                else:
                    logger.warning("[lista_espera] Falló envío de oferta → %s", email_paciente)
            else:
                logger.warning(
                    "[lista_espera] Sin email para paciente %s — oferta no enviada (link: %s)",
                    paciente_id_str, link,
                )

        # Programar verificación de vencimiento fuera del bloque de DB
        verificar_vencimiento_oferta.apply_async(
            args=[turno_id, inscripcion_id_str],
            countdown=TOKEN_EXPIRY_HOURS * 3600,
        )
        return True
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.ofertar_turno_lista_espera")
def ofertar_turno_lista_espera(turno_id: str) -> bool:
    return asyncio.run(_ofertar_turno_lista_espera(turno_id))


async def _verificar_vencimiento_oferta(turno_id: str, inscripcion_id: str) -> None:
    engine, session_factory = _make_session_factory()
    try:
        async with session_factory() as db:
            result = await db.execute(
                select(ListaEspera).where(ListaEspera.id == UUID(inscripcion_id))
            )
            inscripcion = result.scalar_one_or_none()

            if not inscripcion or not inscripcion.activo:
                logger.info(
                    "[lista_espera] Inscripción %s ya fue resuelta (aceptó o rechazó).",
                    inscripcion_id,
                )
                return

            # No respondió en 4hs → marcar inactivo y pasar al siguiente
            inscripcion.activo = False
            await db.commit()
            logger.info(
                "[lista_espera] Oferta vencida para inscripción %s. Ofertando al siguiente.",
                inscripcion_id,
            )

        ofertar_turno_lista_espera.delay(turno_id)
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.verificar_vencimiento_oferta")
def verificar_vencimiento_oferta(turno_id: str, inscripcion_id: str) -> None:
    asyncio.run(_verificar_vencimiento_oferta(turno_id, inscripcion_id))
