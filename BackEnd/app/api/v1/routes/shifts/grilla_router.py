# app/api/v1/shifts/grilla.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.shifts.turno import (
    GenerarGrillaRequest,
    GrillaGeneradaResponse,
    BloquearDiaRequest,
    BloquearDiaResponse,
    ModificarCuposRangoRequest,
    ModificarCuposResponse,
)
from app.services.shifts.grilla_service import (
    generar_grilla,
    bloquear_dia,
    reducir_cupos_rango,
)
from app.core.dependencies import get_current_secretaria  # middleware de auth

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
            secretaria_id=secretaria.id,
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
            secretaria_id=secretaria.id,
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
            secretaria_id=secretaria.id,
        )
        return resultado
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
