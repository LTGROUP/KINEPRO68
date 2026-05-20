# app/api/v1/turnos_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from app.db.session import get_db
from app.schemas.turno import (
    TurnosDisponiblesResponse,
    TurnoDisponibleResponse,
)
from app.services.turnos_service import consultar_turnos_disponibles

router = APIRouter(prefix="/turnos", tags=["Turnos"])


@router.get(
    "/disponibles",
    response_model=TurnosDisponiblesResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener turnos disponibles para una fecha",
    description="Lista de turnos disponibles para que el paciente elija cuándo tratarse.",
)
async def obtener_turnos_disponibles(
    fecha: date = Query(..., description="Fecha en formato YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """
    Cubre los escenarios de la HU: "Ver turnos disponibles"
    - Escenario 1: Listado exitoso
    - Escenario 2: Listado vacío
    """
    try:
        resultado = await consultar_turnos_disponibles(db, fecha)
        
        # Si es un mensaje (error/sin turnos), retornarlo como HTTPException
        if isinstance(resultado, dict) and "mensaje" in resultado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=resultado["mensaje"],
            )
        
        # Si hay turnos, armar la respuesta
        turnos_response = [
            TurnoDisponibleResponse.model_validate(turno)
            for turno in resultado
        ]
        
        return TurnosDisponiblesResponse(
            fecha=fecha,
            turnos=turnos_response,
            total=len(turnos_response),
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )