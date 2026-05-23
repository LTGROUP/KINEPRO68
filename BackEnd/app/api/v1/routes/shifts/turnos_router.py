# app/api/v1/turnos_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from uuid import UUID
from app.api.dependencies.auth import (
    get_current_profile as get_current_user,
    get_current_staff_manager_profile as get_current_secretaria,
)
from app.db.session import get_db
from app.schemas.shifts.turno import (
    TurnosDisponiblesResponse,
    TurnoDisponibleResponse,
    SolicitarTurnoRequest,
    TurnoSolicitadoResponse,
    MisTurnosResponse,
    ListaEsperaResponse
)
from app.services.shifts.turnos_service import (
    consultar_turnos_disponibles, 
    solicitar_turno, 
    ver_mis_turnos, 
    consultar_lista_espera,
    cancelar_turno
)

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
    
@router.post(
    "/solicitar",
    response_model=TurnoSolicitadoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Solicitar un turno",
    description="El paciente reserva un turno disponible por tipo de tratamiento.",
)
async def solicitar_turno_endpoint(
    request: SolicitarTurnoRequest,
    db: AsyncSession = Depends(get_db),
    paciente=Depends(get_current_user),
):
    try:
        return await solicitar_turno(
            db=db,
            request=request,
            paciente_id=paciente["id"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
@router.get(
    "/mis-turnos",
    response_model=MisTurnosResponse,
    status_code=status.HTTP_200_OK,
    summary="Ver mis turnos",
    description="Lista los turnos reservados del paciente autenticado.",
)
async def ver_mis_turnos_endpoint(
    db: AsyncSession = Depends(get_db),
    paciente=Depends(get_current_user),
):
    try:
        return await ver_mis_turnos(
            db=db,
            paciente_id=paciente["id"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
@router.get(
    "/{turno_id}/lista-espera",
    response_model=ListaEsperaResponse,
    status_code=status.HTTP_200_OK,
    summary="Consultar lista de espera de un turno",
    description="Lista los pacientes en espera ordenados por prioridad. Solo secretarias.",
)
async def consultar_lista_espera_endpoint(
    turno_id: UUID,
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    try:
        return await consultar_lista_espera(
            db=db,
            turno_id=turno_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.patch(
    "/{turno_id}/cancelar",
    status_code=status.HTTP_200_OK,
    summary="Cancelar un turno reservado",
    description="El paciente cancela un turno propio. Si faltan menos de 48hs, avisa que no podrá reasignarlo.",
)
async def cancelar_turno_endpoint(
    turno_id: UUID,
    db: AsyncSession = Depends(get_db),
    paciente=Depends(get_current_user),
):
    try:
        return await cancelar_turno(db=db, turno_id=turno_id)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )