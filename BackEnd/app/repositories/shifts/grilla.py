# app/repositories/shifts/grilla.py
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession #ORM para conectarme a la base de datos postgreseSQL
from sqlalchemy import select, delete, and_, func
from app.models.turno import Turno, DiasCerrados, EstadoTurno
from app.integrations.supabase.client import get_supabase_admin_client


async def eliminar_turnos_disponibles_del_mes(
    db: AsyncSession,
    primer_dia_mes: date,
    ultimo_dia_mes: date,
) -> int:
    result = await db.execute(
        delete(Turno).where(
            and_(
                Turno.fecha >= primer_dia_mes,
                Turno.fecha <= ultimo_dia_mes,
                Turno.estado == EstadoTurno.DISPONIBLE,
            )
        )
    )
    return result.rowcount


async def obtener_dias_cerrados_del_mes(
    db: AsyncSession,
    primer_dia_mes: date,
    ultimo_dia_mes: date,
) -> list[DiasCerrados]:
    result = await db.execute(
        select(DiasCerrados).where(
            and_(
                DiasCerrados.fecha >= primer_dia_mes,
                DiasCerrados.fecha <= ultimo_dia_mes,
            )
        )
    )
    return result.scalars().all()


async def obtener_turnos_del_dia(
    db: AsyncSession,
    fecha: date,
) -> list[Turno]:
    result = await db.execute(
        select(Turno).where(
            and_(
                Turno.fecha == fecha,
                Turno.estado.in_([EstadoTurno.DISPONIBLE, EstadoTurno.RESERVADO])
            )
        )
    )
    return result.scalars().all()


async def obtener_turnos_del_rango(
    db: AsyncSession,
    fecha_desde: date,
    fecha_hasta: date,
) -> list[Turno]:
    result = await db.execute(
        select(Turno).where(
            and_(
                Turno.fecha >= fecha_desde,
                Turno.fecha <= fecha_hasta,
                Turno.estado.in_([EstadoTurno.DISPONIBLE, EstadoTurno.RESERVADO])
            )
        ).order_by(Turno.fecha, Turno.hora_inicio)
    )
    return result.scalars().all()


def obtener_todos_professional_profiles() -> list[dict]:
    """Devuelve todos los perfiles de profesionales con horarios (sync, Supabase client)."""
    response = (
        get_supabase_admin_client()
        .table("professional_profiles")
        .select("profile_id,horario_entrada,horario_salida")
        .execute()
    )
    return response.data or []


async def obtener_conteo_turnos_por_profesional_mes(
    db: AsyncSession,
    primer_dia_mes: date,
    ultimo_dia_mes: date,
) -> dict[tuple[str, date], int]:
    """Carga la cantidad de turnos ya asignados a cada profesional en el mes."""
    result = await db.execute(
        select(
            Turno.profesional_id,
            Turno.fecha,
            func.count(Turno.id).label("n"),
        )
        .where(
            and_(
                Turno.fecha >= primer_dia_mes,
                Turno.fecha <= ultimo_dia_mes,
                Turno.profesional_id.isnot(None),
            )
        )
        .group_by(Turno.profesional_id, Turno.fecha)
    )
    conteo: dict[tuple[str, date], int] = {}
    for row in result.all():
        conteo[(str(row.profesional_id), row.fecha)] = row.n
    return conteo