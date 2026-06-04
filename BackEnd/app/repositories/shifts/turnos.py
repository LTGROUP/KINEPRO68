from datetime import date, time
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, extract
from app.models.turno import Turno, EstadoTurno, ListaEspera, AreaTratamiento
from typing import Optional
from sqlalchemy.orm import joinedload

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

#Busca todos los turnos por fecha Disponibles y Reservados
async def obtener_turnos_para_paciente_por_fecha(
    db: AsyncSession,
    fecha_buscada: date,
):
    query = (
        select(Turno)
        .where(
            and_(
                Turno.fecha == fecha_buscada,
                Turno.estado.in_([
                    EstadoTurno.DISPONIBLE,
                    EstadoTurno.RESERVADO,
                ])
            )
        )
        .order_by(Turno.hora_inicio)
    )

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
                       Turno.estado.in_([
                            EstadoTurno.RESERVADO,
                            EstadoTurno.CANCELADO,
                            EstadoTurno.AUSENTE,
                            EstadoTurno.PRESENTE,
                       ])
                  )
             ).order_by(Turno.fecha, Turno.hora_inicio)
        )
        return result.scalars().all()

async def crear_inscripcion_lista_espera(
    db: AsyncSession,
    turno_id: UUID,
    paciente_id: UUID,
    area_tratamiento: AreaTratamiento, 
):
    inscripcion = ListaEspera(
        turno_id=turno_id,
        paciente_id=paciente_id,
        area_tratamiento=area_tratamiento 
    )
    db.add(inscripcion)
    await db.commit()
    await db.refresh(inscripcion)
    return inscripcion

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

async def obtener_inscripcion_lista_espera(
    db: AsyncSession,
    turno_id: UUID,
    paciente_id: UUID,
):
    result = await db.execute(
        select(ListaEspera).where(
            and_(
                ListaEspera.turno_id == turno_id,
                ListaEspera.paciente_id == paciente_id,
                ListaEspera.activo == True
            )
        )
    )
    return result.scalar_one_or_none()

async def obtener_todos_turnos_por_fecha(
    db: AsyncSession,
    fecha_buscada: date,
) -> list[Turno]:
    result = await db.execute(
        select(Turno)
        .where(Turno.fecha == fecha_buscada)
        .order_by(Turno.hora_inicio)
    )
    return result.scalars().all()

async def verificar_paciente_en_lista(
    db: AsyncSession,
    turno_id: UUID,
    paciente_id: UUID,
) -> bool:
    result = await db.execute(
        select(ListaEspera).where(
            and_(
                ListaEspera.turno_id == turno_id,
                ListaEspera.paciente_id == paciente_id,
                ListaEspera.activo == True,
            )
        )
    )
    return result.scalar_one_or_none() is not None


async def inscribir_en_lista_espera(
    db: AsyncSession,
    turno_id: UUID,
    paciente_id: UUID,
) -> ListaEspera:
    entrada = ListaEspera(turno_id=turno_id, paciente_id=paciente_id)
    db.add(entrada)
    await db.flush()
    return entrada


async def obtener_agenda_diaria_pura(db: AsyncSession, fecha_buscada: date, area: Optional[str] = None):
    filtros = [
        Turno.fecha == fecha_buscada,
        Turno.estado != EstadoTurno.DISPONIBLE
    ]
    
    if area:
        filtros.append(Turno.area_tratamiento == area)
        
    query = (
        select(Turno)
        .where(and_(*filtros))
        .order_by(Turno.hora_inicio)
    )
    result = await db.execute(query)
    return result.scalars().all()

async def obtener_metricas_cancelaciones(db: AsyncSession):
    result = await db.execute(
        select(Turno.estado, func.count(Turno.id).label("total"))
        .group_by(Turno.estado)
    )
    return result.all()

async def obtener_primer_paciente_en_espera(db: AsyncSession, turno_id: UUID) -> ListaEspera | None:
    result = await db.execute(
        select(ListaEspera).where(
            and_(
                ListaEspera.turno_id == turno_id,
                ListaEspera.activo == True,
            )
        ).order_by(ListaEspera.fecha_inscripcion).limit(1)
    )
    return result.scalar_one_or_none()


async def obtener_cancelaciones_por_mes(db: AsyncSession):
    result = await db.execute(
        select(
            extract('month', Turno.fecha).label("mes"),
            extract('year', Turno.fecha).label("anio"),
            Turno.estado,
            func.count(Turno.id).label("total")
        )
        .where(Turno.estado.in_([
            EstadoTurno.CANCELADO,
            EstadoTurno.RESERVADO,
            EstadoTurno.PRESENTE,
        ]))
        .group_by("anio", "mes", Turno.estado)
        .order_by("anio", "mes")
    )
    return result.all()