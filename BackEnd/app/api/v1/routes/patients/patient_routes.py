from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies.auth import get_current_staff_manager_profile
from app.schemas.patients.patient_schema import (
    PatientCreateRequest,
    PatientListResponse,
    PatientResponse,
    PatientUpdateRequest,
)
from app.services.patients.patient_service import (
    create_patient,
    get_patient_detail,
    list_patients,
    update_patient,
)


router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=PatientListResponse)
def get_patient_list(
    current_profile: dict = Depends(get_current_staff_manager_profile),
    include_inactive: bool = Query(default=False),
) -> PatientListResponse:
    try:
        return list_patients(
            actor_role=current_profile["rol"],
            include_inactive=include_inactive,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo obtener el listado de pacientes.",
        ) from error


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient_detail_route(
    patient_id: str,
    current_profile: dict = Depends(get_current_staff_manager_profile),
) -> PatientResponse:
    try:
        return get_patient_detail(patient_id=patient_id, actor_role=current_profile["rol"])
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo obtener el detalle del paciente.",
        ) from error


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def post_patient(
    data: PatientCreateRequest,
    current_profile: dict = Depends(get_current_staff_manager_profile),
) -> PatientResponse:
    try:
        return create_patient(
            data,
            actor_role=current_profile["rol"],
            actor_id=current_profile["id"],
            actor_dni=current_profile["dni"],
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo registrar el paciente. Revisá que los datos sean válidos.",
        ) from error


@router.patch("/{patient_id}", response_model=PatientResponse)
def patch_patient(
    patient_id: str,
    data: PatientUpdateRequest,
    current_profile: dict = Depends(get_current_staff_manager_profile),
) -> PatientResponse:
    try:
        return update_patient(
            patient_id=patient_id,
            data=data,
            actor_role=current_profile["rol"],
            actor_id=current_profile["id"],
            actor_dni=current_profile["dni"],
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo actualizar el paciente. Revisá que los datos sean válidos.",
        ) from error
