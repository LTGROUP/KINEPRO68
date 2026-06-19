from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies.auth import (
    get_current_patient_profile,
    get_current_professional_profile,
)
from app.schemas.routines.routine_schema import (
    RoutineCreateRequest,
    RoutineListResponse,
    RoutineResponse,
    RoutineUpdateRequest,
)
from app.services.routines.routine_service import (
    create_routine,
    deactivate_routine,
    get_active_routine_by_patient,
    get_own_active_routine,
    list_active_routines_by_patient,
    update_routine,
)

router = APIRouter(prefix="/routines", tags=["routines"])


@router.get("/me", response_model=RoutineResponse)
def get_my_active_routine(
    current_profile: dict = Depends(get_current_patient_profile),
) -> RoutineResponse:
    try:
        return get_own_active_routine(
            patient_id=current_profile["id"],
            actor_role=current_profile["rol"],
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo obtener tu rutina.",
        ) from error


@router.post("", response_model=RoutineResponse, status_code=status.HTTP_201_CREATED)
def post_routine(
    data: RoutineCreateRequest,
    current_profile: dict = Depends(get_current_professional_profile),
) -> RoutineResponse:
    try:
        return create_routine(
            data=data,
            actor_role=current_profile["rol"],
            actor_id=current_profile["id"],
            actor_dni=current_profile.get("dni"),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear la rutina.",
        ) from error


@router.get("/patient/{patient_id}", response_model=RoutineResponse)
def get_patient_active_routine(
    patient_id: str,
    current_profile: dict = Depends(get_current_professional_profile),
) -> RoutineResponse:
    try:
        return get_active_routine_by_patient(
            patient_id=patient_id,
            actor_role=current_profile["rol"],
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo obtener la rutina del paciente.",
        ) from error


@router.get("/patient/{patient_id}/list", response_model=RoutineListResponse)
def get_patient_routines(
    patient_id: str,
    current_profile: dict = Depends(get_current_professional_profile),
) -> RoutineListResponse:
    try:
        return list_active_routines_by_patient(
            patient_id=patient_id,
            actor_role=current_profile["rol"],
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo obtener el listado de rutinas.",
        ) from error


@router.patch("/{routine_id}", response_model=RoutineResponse)
def patch_routine(
    routine_id: str,
    data: RoutineUpdateRequest,
    current_profile: dict = Depends(get_current_professional_profile),
) -> RoutineResponse:
    try:
        return update_routine(
            routine_id=routine_id,
            data=data,
            actor_role=current_profile["rol"],
            actor_id=current_profile["id"],
            actor_dni=current_profile.get("dni"),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo actualizar la rutina.",
        ) from error


@router.delete("/{routine_id}", response_model=RoutineResponse)
def delete_routine(
    routine_id: str,
    current_profile: dict = Depends(get_current_professional_profile),
) -> RoutineResponse:
    try:
        return deactivate_routine(
            routine_id=routine_id,
            actor_role=current_profile["rol"],
            actor_id=current_profile["id"],
            actor_dni=current_profile.get("dni"),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo eliminar la rutina.",
        ) from error
