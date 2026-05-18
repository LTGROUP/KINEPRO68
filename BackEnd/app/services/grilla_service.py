# app/services/grilla_service.py
from datetime import date, time, datetime, timedelta
from typing import List, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from app.models.turno import Turno, ConfiguracionGrilla, DiasCerrados, EstadoTurno
from app.schemas.turno import (
    GenerarGrillaRequest,
    FranjaHoraria,
    GrillaGeneradaResponse,
    BloquearDiaResponse,
    ModificarCuposResponse,
)
import calendar

DURACION_SESION_MINUTOS = 40

DIAS_SEMANA_MAP = {
    "lunes": 0, "martes": 1, "miercoles": 2,
    "jueves": 3, "viernes": 4, "sabado": 5, "domingo": 6
}


def _generar_slots(franjas: List[FranjaHoraria]) -> List[Tuple[time, time]]:
    slots = []
    for franja in franjas:
        inicio = datetime.combine(date.today(), franja.hora_inicio)
        fin_limite = datetime.combine(date.today(), franja.hora_fin)
        while inicio + timedelta(minutes=DURACION_SESION_MINUTOS) <= fin_limite:
            fin_slot = inicio + timedelta(minutes=DURACION_SESION_MINUTOS)
            slots.append((inicio.time(), fin_slot.time()))
            inicio = fin_slot
    return slots


def _es_dia_habil(fecha: date, dias_habiles: List[str]) -> bool:
    nombre_dia = list(DIAS_SEMANA_MAP.keys())[fecha.weekday()]
    return nombre_dia in [d.lower() for d in dias_habiles]


async def generar_grilla(
    db: AsyncSession,
    request: GenerarGrillaRequest,
    secretaria_id: UUID,
) -> GrillaGeneradaResponse:

    hoy = date.today()
    primer_dia_mes = date(request.anio, request.mes, 1)
    ultimo_dia_mes = date(request.anio, request.mes,
                          calendar.monthrange(request.anio, request.mes)[1])

    if ultimo_dia_mes < hoy:
        raise ValueError("No es posible generar disponibilidad para fechas pasadas")

    config = ConfiguracionGrilla(
        mes=request.mes,
        anio=request.anio,
        hora_inicio=request.franjas[0].hora_inicio,
        hora_fin=request.franjas[-1].hora_fin,
        turnos_por_slot=request.turnos_por_slot,
        dias_habiles=",".join(request.dias_habiles),
        creado_por=secretaria_id,
    )
    db.add(config)
    await db.flush()

    slots = _generar_slots(request.franjas)

    dias_cerrados_set = set(request.dias_cerrados or [])

    result = await db.execute(
        select(DiasCerrados).where(
            and_(
                DiasCerrados.fecha >= primer_dia_mes,
                DiasCerrados.fecha <= ultimo_dia_mes,
            )
        )
    )
    dias_cerrados_bd = result.scalars().all()
    for dc in dias_cerrados_bd:
        dias_cerrados_set.add(dc.fecha)

    total_creados = 0
    dias_omitidos = []

    fecha_actual = primer_dia_mes
    while fecha_actual <= ultimo_dia_mes:

        if fecha_actual in dias_cerrados_set:
            dias_omitidos.append(fecha_actual)
            fecha_actual += timedelta(days=1)
            continue

        if not _es_dia_habil(fecha_actual, request.dias_habiles):
            fecha_actual += timedelta(days=1)
            continue

        if fecha_actual < hoy:
            fecha_actual += timedelta(days=1)
            continue

        for hora_ini, hora_fin_slot in slots:
            for _ in range(request.turnos_por_slot):
                turno = Turno(
                    configuracion_id=config.id,
                    fecha=fecha_actual,
                    hora_inicio=hora_ini,
                    hora_fin=hora_fin_slot,
                    estado=EstadoTurno.DISPONIBLE,
                )
                db.add(turno)
                total_creados += 1

        fecha_actual += timedelta(days=1)

    await db.commit()

    if dias_omitidos:
        mensaje = "Agenda generada, omitiendo fechas cerradas"
    else:
        mes_nombre = primer_dia_mes.strftime("%B %Y").capitalize()
        mensaje = f"Agenda generada con éxito para {mes_nombre}"

    return GrillaGeneradaResponse(
        mensaje=mensaje,
        mes=request.mes,
        anio=request.anio,
        total_turnos_creados=total_creados,
        dias_omitidos=dias_omitidos,
    )


async def bloquear_dia(
    db: AsyncSession,
    fecha: date,
    motivo: str,
    secretaria_id: UUID,
) -> BloquearDiaResponse:

    result = await db.execute(
        select(Turno).where(
            and_(
                Turno.fecha == fecha,
                Turno.estado.in_([EstadoTurno.DISPONIBLE, EstadoTurno.RESERVADO])
            )
        )
    )
    turnos = result.scalars().all()

    pacientes_a_contactar = []
    turnos_eliminados = 0

    for turno in turnos:
        if turno.estado == EstadoTurno.RESERVADO:
            pacientes_a_contactar.append(turno.paciente_id)
        else:
            await db.delete(turno)
            turnos_eliminados += 1

    dia_cerrado = DiasCerrados(
        fecha=fecha,
        motivo=motivo,
        creado_por=secretaria_id,
    )
    db.add(dia_cerrado)
    await db.commit()

    if pacientes_a_contactar:
        mensaje = (
            f"Día {fecha} bloqueado. "
            f"{len(pacientes_a_contactar)} paciente(s) con turno asignado deben ser contactados."
        )
    else:
        mensaje = f"Día {fecha} bloqueado. Todos los cupos libres fueron eliminados."

    return BloquearDiaResponse(
        mensaje=mensaje,
        fecha=fecha,
        turnos_eliminados=turnos_eliminados,
        pacientes_a_contactar=pacientes_a_contactar,
    )


async def reducir_cupos_rango(
    db: AsyncSession,
    fecha_desde: date,
    fecha_hasta: date,
    secretaria_id: UUID,
) -> ModificarCuposResponse:

    result = await db.execute(
        select(Turno).where(
            and_(
                Turno.fecha >= fecha_desde,
                Turno.fecha <= fecha_hasta,
                Turno.estado.in_([EstadoTurno.DISPONIBLE, EstadoTurno.RESERVADO])
            )
        ).order_by(Turno.fecha, Turno.hora_inicio)
    )
    turnos = result.scalars().all()

    from collections import defaultdict
    slots_agrupados = defaultdict(list)
    for t in turnos:
        slots_agrupados[(t.fecha, t.hora_inicio)].append(t)

    pacientes_a_contactar = []
    turnos_reducidos = 0

    for (fecha, hora), turnos_slot in slots_agrupados.items():
        disponibles = [t for t in turnos_slot if t.estado == EstadoTurno.DISPONIBLE]
        reservados  = [t for t in turnos_slot if t.estado == EstadoTurno.RESERVADO]

        for t in reservados:
            if t.paciente_id not in pacientes_a_contactar:
                pacientes_a_contactar.append(t.paciente_id)

        if disponibles:
            await db.delete(disponibles[0])
            turnos_reducidos += 1

    await db.commit()

    if pacientes_a_contactar:
        mensaje = (
            f"Cupos reducidos en el rango {fecha_desde} al {fecha_hasta}. "
            f"{len(pacientes_a_contactar)} paciente(s) con turno asignado deben ser contactados."
        )
    else:
        mensaje = f"Cupos reducidos correctamente en el rango {fecha_desde} al {fecha_hasta}."

    return ModificarCuposResponse(
        mensaje=mensaje,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        turnos_reducidos=turnos_reducidos,
        pacientes_a_contactar=pacientes_a_contactar,
    )