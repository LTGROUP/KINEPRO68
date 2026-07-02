import asyncio
import logging
from datetime import datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from jose import jwt
from sqlalchemy import select, and_, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.celery_app import celery_app
from app.config import settings
from app.integrations.email.email_service import send_oferta_turno_lista_espera
from app.models.turno import Turno, EstadoTurno, ListaEspera
from app.integrations.email import send_cupo_liberado_email

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
            # Verificar que el turno siga "pendiente de oferta"
            result_turno = await db.execute(
                select(Turno).where(Turno.id == UUID(turno_id))
            )
            turno = result_turno.scalar_one_or_none()

            if not turno:
                logger.info("[lista_espera] Turno %s no existe.", turno_id)
                return False

            turno_pendiente_oferta = (
                turno.estado == EstadoTurno.RESERVADO and turno.paciente_id is None
            )
            if not turno_pendiente_oferta:
                logger.info(
                    "[lista_espera] Turno %s ya no está pendiente de oferta (estado=%s, paciente_id=%s).",
                    turno_id, turno.estado, turno.paciente_id,
                )
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
                # Nadie más en la lista: recién ahí se libera el turno
                turno.estado = EstadoTurno.DISPONIBLE
                db.add(turno)
                await db.commit()
                logger.info(
                    "[lista_espera] Sin inscriptos en espera para turno %s. Turno liberado a DISPONIBLE.",
                    turno_id,
                )
                return False

            inscripcion_id_str = str(inscripcion.id)
            paciente_id_str = str(inscripcion.paciente_id)

            # Buscar datos de contacto del paciente en profiles
            result_paciente = await db.execute(
                text("SELECT nombre, apellido, email FROM profiles WHERE id = :id"),
                {"id": inscripcion.paciente_id},
            )
            paciente = result_paciente.first()

            if not paciente or not paciente.email:
                logger.warning(
                    "[lista_espera] No se encontró email para paciente %s. No se puede notificar.",
                    paciente_id_str,
                )
                return False

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

            nombre_completo = f"{paciente.nombre} {paciente.apellido}".strip()

            enviado = send_cupo_liberado_email(
                email=paciente.email,
                nombre=nombre_completo,
                area_tratamiento=turno.area_tratamiento.value if turno.area_tratamiento else "",
                fecha=turno.fecha.strftime("%d/%m/%Y"),
                hora_inicio=turno.hora_inicio.strftime("%H:%M"),
                hora_fin=turno.hora_fin.strftime("%H:%M"),
                link=link,
                horas_validez=TOKEN_EXPIRY_HOURS,
            )

            if enviado:
                logger.info(
                    "[lista_espera] Email de cupo liberado enviado a %s (paciente %s, turno %s).",
                    paciente.email, paciente_id_str, turno_id,
                )
            else:
                logger.warning(
                    "[lista_espera] Falló el envío de email a %s (paciente %s, turno %s). "
                    "Se programa igual el vencimiento de la oferta.",
                    paciente.email, paciente_id_str, turno_id,
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