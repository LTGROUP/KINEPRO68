from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.turno import Turno, EstadoTurno

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



