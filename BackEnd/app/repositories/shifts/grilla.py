# app/repositories/shifts/grilla.py
from datetime import date , time
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.turno import Turno, DiasCerrados, EstadoTurno, ListaEspera


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

async def obtener_turno_por_id_con_lock(
    db: AsyncSession,
    turno_id: UUID,
) -> Turno | None: 
    result = await db.execute(
        select(Turno)
        .Where(Turno.id == turno_id)
        .with_for_update()
    )
    return result.scalar_one_or_none()

async def obtener_turno_existente_del_paciente(
        db:AsyncSession,
        paciente_id: UUID,
        fecha: date,
        hora_inicio: time,
) -> Turno | None:
    result = await db.execute(
        select(Turno).where(
            and_(
                Turno.paciente_id == paciente_id,
                Turno.fecha == fecha,
                Turno.hora_inicio == hora_inicio,
                Turno.estado == EstadoTurno.RESERVADO,
            )
        )
    )
    return result.scalar_one_or_none()

async def obtener_turnos_del_paciente(
        db:AsyncSession,
        paciente_id:UUID,
) -> list[Turno]: 
        result = await db.execute(
             select(Turno).where(
                  and_(
                       Turno.paciente_id == paciente_id,
                       Turno.estado.in_([EstadoTurno.RESERVADO, EstadoTurno.CANCELADO])
                  )
             ).order_by(Turno.fecha, Turno.hora_inicio)
        )
        return result.scalars().all()

async def obtener_lista_espera_por_turno(
    db: AsyncSession,
    turno_id: UUID,
) -> list[ListaEspera]:
    result = await db.execute(
        select(ListaEspera).where(
            and_(
                ListaEspera.turno_id == turno_id,
                ListaEspera.activo == True,
            )
        ).order_by(ListaEspera.fecha_inscripcion)  # FIFO — primero en inscribirse, primero en la lista
    )
    return result.scalars().all()