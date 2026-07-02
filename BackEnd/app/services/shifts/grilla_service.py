# app/services/grilla_service.py
from collections import defaultdict
from datetime import date, time, datetime, timedelta
from typing import List, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.turno import Turno, ConfiguracionGrilla, EstadoTurno , DiasCerrados
from app.schemas.shifts.turno import (
    GenerarGrillaRequest,
    FranjaHoraria,
    GrillaGeneradaResponse,
    BloquearDiaResponse,
    ModificarCuposResponse,
)
from app.repositories.shifts.grilla import (
    eliminar_turnos_disponibles_del_mes,
    obtener_dias_cerrados_del_mes,
    obtener_turnos_del_dia,
    obtener_turnos_del_rango,
    obtener_todos_professional_profiles,
    obtener_conteo_turnos_por_profesional_mes,
)
import calendar

DURACION_SESION_MINUTOS = 60


def _parse_time_str(t_str: str | None) -> time:
    if not t_str:
        return time(0, 0)
    try:
        parts = t_str.split(":")
        return time(int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        return time(0, 0)


def _elegir_profesional(
    profesionales: list[dict],
    hora_inicio: time,
    hora_fin: time,
    conteo: defaultdict,
    fecha: date,
) -> UUID | None:
    disponibles = [
        p for p in profesionales
        if _parse_time_str(p.get("horario_entrada")) <= hora_inicio
        and _parse_time_str(p.get("horario_salida")) >= hora_fin
    ]
    if not disponibles:
        return None
    elegido = min(disponibles, key=lambda p: conteo[(p["profile_id"], fecha)])
    conteo[(elegido["profile_id"], fecha)] += 1
    return UUID(elegido["profile_id"])

DIAS_SEMANA_MAP = {
    "lunes": 0, "martes": 1, "miercoles": 2,
    "jueves": 3, "viernes": 4, "sabado": 5, "domingo": 6
}

MESES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
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

    await eliminar_turnos_disponibles_del_mes(db, primer_dia_mes, ultimo_dia_mes)

    conteo_existente = await obtener_conteo_turnos_por_profesional_mes(db, primer_dia_mes, ultimo_dia_mes)
    conteo: defaultdict = defaultdict(int, conteo_existente)
    profesionales = obtener_todos_professional_profiles()

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

    
    dias_cerrados_bd =  await obtener_dias_cerrados_del_mes(db, primer_dia_mes, ultimo_dia_mes)
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
                prof_id = _elegir_profesional(profesionales, hora_ini, hora_fin_slot, conteo, fecha_actual)
                turno = Turno(
                    configuracion_id=config.id,
                    fecha=fecha_actual,
                    hora_inicio=hora_ini,
                    hora_fin=hora_fin_slot,
                    estado=EstadoTurno.DISPONIBLE,
                    profesional_id=prof_id,
                )
                db.add(turno)
                total_creados += 1

        fecha_actual += timedelta(days=1)

    await db.commit()

    if dias_omitidos:
        mensaje = "Agenda generada, omitiendo fechas cerradas"
    else:
        mes_nombre = f"{MESES_ES[request.mes]} {request.anio}"
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

    
    turnos = await obtener_turnos_del_dia(db, fecha)

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

    
    turnos = await obtener_turnos_del_rango(db, fecha_desde, fecha_hasta)

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