# app/repositories/shifts/grilla.py
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession #ORM para conectarme a la base de datos postgreseSQL
from sqlalchemy import select, delete, and_
from app.models.turno import Turno, DiasCerrados, EstadoTurno, ConfiguracionGrilla
from typing import Optional


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
async def obtener_configuracion_por_mes(
    db: AsyncSession,
    mes: int,
    anio: int,
) -> Optional[ConfiguracionGrilla]:
    result = await db.execute(
        select(ConfiguracionGrilla).where(
            and_(
                ConfiguracionGrilla.mes == mes,
                ConfiguracionGrilla.anio == anio,
            )
        )
    )
    return result.scalar_one_or_none()