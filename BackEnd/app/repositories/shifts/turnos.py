from datetime import date, time
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.turno import Turno, EstadoTurno ,ListaEspera

# Busca todos los turnos que coincidan con la fecha
async def obtener_turnos_disponibles_por_fecha(db: AsyncSession, fecha_buscada: date):
    query = select(Turno).where(
        and_(
            Turno.fecha == fecha_buscada,
            Turno.estado == EstadoTurno.DISPONIBLE
        )
    ).order_by(Turno.hora_inicio)
    
    result = await db.execute(query)
    return result.scalars().all()

# Actualiza el estado de un turno seleccionado
async def actualizar_estado_turno(db: AsyncSession, turno: Turno, nuevo_estado: EstadoTurno):
    turno.estado = nuevo_estado #type: ignore
    db.add(turno)
    await db.commit()
    await db.refresh(turno)
    return turno

async def obtener_turno_por_id_con_lock(
    db: AsyncSession,
    turno_id: UUID,
) -> Turno | None: 
    result = await db.execute(
        select(Turno)
        .where(Turno.id == turno_id)
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
