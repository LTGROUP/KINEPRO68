from datetime import date, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_professional_profile
from app.db.session import get_db
from app.schemas.shifts.turno import AgendaProfesionalResponse
from app.services.shifts.profesional_service import consultar_agenda_profesional

ARGENTINA_TZ = ZoneInfo("America/Argentina/Buenos_Aires")

router = APIRouter(prefix="/profesional", tags=["Profesional"])


@router.get(
    "/agenda",
    response_model=AgendaProfesionalResponse,
    status_code=status.HTTP_200_OK,
    summary="Consultar agenda del profesional por fecha",
    description="Devuelve los turnos asignados al profesional autenticado para la fecha indicada.",
)
async def obtener_agenda_profesional_endpoint(
    fecha: date = Query(..., description="Fecha en formato YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    profesional: dict = Depends(get_current_professional_profile),
):
    try:
        profesional_id = UUID(str(profesional["id"]))
        return await consultar_agenda_profesional(db=db, profesional_id=profesional_id, fecha=fecha)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/agenda/hoy",
    response_model=AgendaProfesionalResponse,
    status_code=status.HTTP_200_OK,
    summary="Consultar agenda del profesional para hoy",
    description="Devuelve los turnos asignados al profesional autenticado para la fecha actual (zona Argentina).",
)
async def obtener_agenda_profesional_hoy_endpoint(
    db: AsyncSession = Depends(get_db),
    profesional: dict = Depends(get_current_professional_profile),
):
    try:
        hoy = datetime.now(ARGENTINA_TZ).date()
        profesional_id = UUID(str(profesional["id"]))
        return await consultar_agenda_profesional(db=db, profesional_id=profesional_id, fecha=hoy)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
