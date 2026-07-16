# app/api/v1/shifts/grilla.py
import calendar
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.shifts.turno import (
    GenerarGrillaRequest,
    GrillaGeneradaResponse,
    BloquearDiaRequest,
    BloquearDiaResponse,
    ModificarCuposRangoRequest,
    ModificarCuposResponse,
    DiaCerradoRequest,
    DiaCerradoResponse,
    EliminarDiaCerradoResponse,
    DiasCerradosListResponse,
    DiaCerradoItem,
    EditarHorarioDiaRequest,
    EditarHorarioDiaResponse,
)
from app.services.shifts.grilla_service import (
    generar_grilla,
    bloquear_dia,
    reducir_cupos_rango,
    editar_horario_dia,
    registrar_dia_cerrado,
)
from app.repositories.shifts.grilla import (
    obtener_dia_cerrado_por_fecha,
    eliminar_dia_cerrado,
    obtener_dias_cerrados_del_mes,
)
from app.api.dependencies.auth import get_current_staff_manager_profile as get_current_secretaria

router = APIRouter(prefix="/grilla", tags=["Grilla de turnos"])


@router.post(
    "/generar",
    response_model=GrillaGeneradaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generar grilla mensual de turnos",
    description="Crea todos los cupos disponibles para un mes. Solo secretarias autenticadas.",
)
async def generar_grilla_endpoint(
    request: GenerarGrillaRequest,
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    """
    Cubre los escenarios 1, 2 y 3 de la HU #33:
    - Escenario 1: Generación exitosa
    - Escenario 2: Fallo si el mes ya pasó
    - Escenario 3: Omite días marcados como feriado/cerrado
    """
    try:
        resultado = await generar_grilla(
            db=db,
            request=request,
            secretaria_id=secretaria["id"],
        )
        return resultado
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch(
    "/bloquear-dia",
    response_model=BloquearDiaResponse,
    summary="Bloquear un día completo",
    description="Elimina cupos libres y alerta sobre pacientes con turno reservado ese día.",
)
async def bloquear_dia_endpoint(
    request: BloquearDiaRequest,
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    """
    Cubre el escenario 4 de la HU #33.
    """
    try:
        resultado = await bloquear_dia(
            db=db,
            fecha=request.fecha,
            motivo=request.motivo or "Bloqueado por administración",
            secretaria_id=secretaria["id"],
        )
        return resultado
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch(
    "/reducir-cupos",
    response_model=ModificarCuposResponse,
    summary="Reducir cupos disponibles en un rango de fechas",
    description="Elimina un cupo disponible por slot en el rango indicado.",
)
async def reducir_cupos_endpoint(
    request: ModificarCuposRangoRequest,
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    """
    Cubre el escenario 5 de la HU #33.
    """
    try:
        resultado = await reducir_cupos_rango(
            db=db,
            fecha_desde=request.fecha_desde,
            fecha_hasta=request.fecha_hasta,
            secretaria_id=secretaria["id"],
        )
        return resultado
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/dias-cerrados",
    response_model=DiaCerradoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un día cerrado",
    description="Marca una fecha como feriado/cerrada para que el generador de grilla la omita.",
)
async def crear_dia_cerrado_endpoint(
    request: DiaCerradoRequest,
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    existente = await obtener_dia_cerrado_por_fecha(db, request.fecha)
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un día cerrado para esa fecha",
        )

    await registrar_dia_cerrado(
        db=db,
        fecha=request.fecha,
        motivo=request.motivo,
        creado_por=secretaria["id"],
        horario_inicio=request.horario_inicio,
        horario_fin=request.horario_fin,
    )

    mensaje = (
        "Horario reducido registrado correctamente"
        if request.horario_inicio and request.horario_fin
        else "Día cerrado registrado correctamente"
    )

    return DiaCerradoResponse(
        mensaje=mensaje,
        fecha=request.fecha,
        horario_inicio=request.horario_inicio,
        horario_fin=request.horario_fin,
    )


@router.delete(
    "/dias-cerrados/{fecha}",
    response_model=EliminarDiaCerradoResponse,
    summary="Eliminar un día cerrado",
    description="Reabre una fecha previamente marcada como feriado/cerrada.",
)
async def eliminar_dia_cerrado_endpoint(
    fecha: date,
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    filas_eliminadas = await eliminar_dia_cerrado(db, fecha)
    if not filas_eliminadas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe un día cerrado para esa fecha",
        )

    return EliminarDiaCerradoResponse(mensaje="Día cerrado eliminado correctamente")


@router.patch(
    "/dias/{fecha}/horario",
    response_model=EditarHorarioDiaResponse,
    summary="Editar el horario de un día ya generado",
    description="Reemplaza los turnos disponibles de una fecha con un nuevo horario, sin afectar los turnos ya reservados.",
)
async def editar_horario_dia_endpoint(
    fecha: date,
    request: EditarHorarioDiaRequest,
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    try:
        resultado = await editar_horario_dia(
            db=db,
            fecha=fecha,
            hora_inicio=request.hora_inicio,
            hora_fin=request.hora_fin,
            secretaria_id=secretaria["id"],
        )
        return resultado
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/dias-cerrados",
    response_model=DiasCerradosListResponse,
    summary="Listar días cerrados de un mes",
    description="Devuelve las fechas marcadas como feriado/cerradas para el mes y año indicados.",
)
async def listar_dias_cerrados_endpoint(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(...),
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    primer_dia_mes = date(anio, mes, 1)
    ultimo_dia_mes = date(anio, mes, calendar.monthrange(anio, mes)[1])

    dias_cerrados = await obtener_dias_cerrados_del_mes(db, primer_dia_mes, ultimo_dia_mes)

    return DiasCerradosListResponse(
        dias_cerrados=[
            DiaCerradoItem(
                fecha=dc.fecha,
                motivo=dc.motivo,
                horario_inicio=dc.horario_inicio,
                horario_fin=dc.horario_fin,
            )
            for dc in dias_cerrados
        ]
    )
