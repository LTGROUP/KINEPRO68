from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.api.dependencies.auth import get_current_staff_manager_profile
from app.tasks.actualizar_estados import _run_actualizar_ausentes

router = APIRouter(prefix="/admin", tags=["Admin"])


class ActualizarAusentesResponse(BaseModel):
    mensaje: str
    turnos_actualizados: int


@router.post(
    "/actualizar-ausentes",
    response_model=ActualizarAusentesResponse,
    status_code=status.HTTP_200_OK,
    summary="Marcar como AUSENTE los turnos reservados vencidos",
    description=(
        "Ejecuta de forma síncrona la misma lógica que la tarea de Celery "
        "tasks.actualizar_ausentes (30 minutos de gracia tras hora_fin). "
        "Pensado para disparar el marcado manualmente cuando Celery/Redis "
        "no están corriendo (desarrollo/demo)."
    ),
)
async def actualizar_ausentes_endpoint(
    staff=Depends(get_current_staff_manager_profile),
):
    turnos_actualizados = await _run_actualizar_ausentes()
    return ActualizarAusentesResponse(
        mensaje=f"{turnos_actualizados} turno(s) marcados como AUSENTE",
        turnos_actualizados=turnos_actualizados,
    )
