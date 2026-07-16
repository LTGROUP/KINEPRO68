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
                            EstadoTurno.REPROGRAMADO,
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

#Grafico metricas
#obtener rango de años en la base de datos
async def obtener_rango_anios(db: AsyncSession):
    result = await db.execute(
        select(
            func.min(extract('year', Turno.fecha)).label("anio_min"),
            func.max(extract('year', Turno.fecha)).label("anio_max"),
        )
    )
    return result.one()
#obtener datos de ausentes, presentes y cancelados
async def obtener_metricas_cancelaciones(
    db: AsyncSession,
    fecha_desde: date = None,
    fecha_hasta: date = None,
    mes: int = None,
    anio: int = None,
):
    query = (
        select(Turno.estado, func.count(Turno.id).label("total"))
        .group_by(Turno.estado)
    )

    if fecha_desde:
        query = query.where(Turno.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.where(Turno.fecha < fecha_hasta)
    if mes and not anio:
        query = query.where(extract('month', Turno.fecha) == mes)
    if anio and not mes:
        query = query.where(extract('year', Turno.fecha) == anio)

    result = await db.execute(query)
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


async def obtener_cancelaciones_por_mes(
    db: AsyncSession,
    fecha_desde: date = None,
    fecha_hasta: date = None,
    mes: int = None,
    anio: int = None,
):
    query = (
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
    )

    if fecha_desde:
        query = query.where(Turno.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.where(Turno.fecha < fecha_hasta)
    if mes and not anio:
        query = query.where(extract('month', Turno.fecha) == mes)
    if anio and not mes:
        query = query.where(extract('year', Turno.fecha) == anio)

    query = query.group_by("anio", "mes", Turno.estado).order_by("anio", "mes")

    result = await db.execute(query)
    return result.all()


async def obtener_turno_por_id_simple(db: AsyncSession, turno_id: UUID) -> Turno | None:
    result = await db.execute(select(Turno).where(Turno.id == turno_id))
    return result.scalar_one_or_none()


async def obtener_inscripcion_por_id(db: AsyncSession, inscripcion_id: UUID) -> ListaEspera | None:
    result = await db.execute(
        select(ListaEspera).where(ListaEspera.id == inscripcion_id)
    )
    return result.scalar_one_or_none()


async def obtener_turnos_por_profesional_y_fecha(
    db: AsyncSession,
    profesional_id: UUID,
    fecha: date,
) -> list[Turno]:
    result = await db.execute(
        select(Turno)
        .where(
            and_(
                Turno.profesional_id == profesional_id,
                Turno.fecha == fecha,
                Turno.estado != EstadoTurno.DISPONIBLE,
            )
        )
        .order_by(Turno.hora_inicio)
    )
    return result.scalars().all()


async def obtener_ausencias_por_rango(
    db: AsyncSession,
    fecha_desde: date,
    fecha_hasta: date,
) -> list[Turno]:
    result = await db.execute(
        select(Turno).where(
            and_(
                Turno.estado == EstadoTurno.AUSENTE,
                Turno.fecha >= fecha_desde,
                Turno.fecha <= fecha_hasta,
            )
        ).order_by(Turno.paciente_id, Turno.fecha)
    )
    return result.scalars().all()

#ver lista de espera (paciente)

async def obtener_inscripciones_lista_espera_por_paciente(db: AsyncSession, paciente_id: UUID):
    # En SQLAlchemy asíncrono/2.0 armamos el select primero
    query = (
        select(ListaEspera, Turno)
        .join(Turno, ListaEspera.turno_id == Turno.id)
        .where(ListaEspera.paciente_id == paciente_id, ListaEspera.activo == True)
    )
    # Ejecutamos con await
    result = await db.execute(query)
    
    # Extraemos todas las filas (retorna una lista de tuplas: [(lista_obj, turno_obj), ...])
    return result.all()

async def obtener_turnos_con_lista_espera_activa(db: AsyncSession):
    conteo_subq = (
        select(
            ListaEspera.turno_id.label("turno_id"),
            func.count(ListaEspera.id).label("cantidad"),
        )
        .where(ListaEspera.activo == True)
        .group_by(ListaEspera.turno_id)
        .subquery()
    )

    result = await db.execute(
        select(Turno, conteo_subq.c.cantidad)
        .join(conteo_subq, conteo_subq.c.turno_id == Turno.id)
        .order_by(Turno.fecha, Turno.hora_inicio)
    )
    return result.all()  # lista de tuplas (Turno, cantidad)