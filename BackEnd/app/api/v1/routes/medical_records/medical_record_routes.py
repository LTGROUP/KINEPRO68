import re

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.dependencies.auth import get_current_professional_profile
from app.schemas.medical_records.medical_record_schema import (
    MedicalRecordCreateRequest,
    MedicalRecordResponse,
    MedicalRecordUpdateRequest,
)
from app.services.medical_records.medical_record_service import (
    create_medical_record,
    get_medical_record_by_patient,
    update_medical_record,
) 

from app.repositories.patients.patient_repository import get_patient_by_id
from app.repositories.medical_records.medical_record_repository import (
    get_complementary_studies_by_record_id,
    get_medical_record_by_id,
)

from app.services.medical_records.pdf_service import generate_medical_record_pdf

router = APIRouter(prefix="/medical-records", tags=["medical-records"])


@router.post("", response_model=MedicalRecordResponse, status_code=status.HTTP_201_CREATED)
def post_medical_record(
    data: MedicalRecordCreateRequest,
    current_profile: dict = Depends(get_current_professional_profile),
) -> MedicalRecordResponse:
    try:
        return create_medical_record(
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
            detail="No se pudo crear la ficha médica.",
        ) from error


@router.get("/patient/{patient_id}", response_model=MedicalRecordResponse)
def get_patient_medical_record(
    patient_id: str,
    current_profile: dict = Depends(get_current_professional_profile),
) -> MedicalRecordResponse:
    try:
        return get_medical_record_by_patient(
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
            detail="No se pudo obtener la ficha médica.",
        ) from error


@router.patch("/{record_id}", response_model=MedicalRecordResponse)
def patch_medical_record(
    record_id: str,
    data: MedicalRecordUpdateRequest,
    current_profile: dict = Depends(get_current_professional_profile),
) -> MedicalRecordResponse:
    try:
        return update_medical_record(
            record_id=record_id,
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
            detail="No se pudo actualizar la ficha médica.",
        ) from error
    
@router.get("/{record_id}/pdf")
def get_medical_record_pdf(
    record_id: str,
    current_profile: dict = Depends(get_current_professional_profile),
) -> Response:
    try:
        record = get_medical_record_by_id(record_id)

        if not record:
            raise ValueError("La ficha médica indicada no existe")

        studies = get_complementary_studies_by_record_id(record_id)
        record["estudios"] = studies

        patient = get_patient_by_id(record["paciente_id"])

        if not patient:
            raise ValueError("El paciente asociado a la ficha médica no existe")

        pdf_bytes = generate_medical_record_pdf(record, patient)

        patient_name = f"{patient['nombre']}_{patient['apellido']}"
        safe_name = re.sub(r"[^A-Za-z0-9_-]", "_", patient_name)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="ficha-medica-{safe_name}.pdf"',
            },
        )
    
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo generar el PDF de la ficha médica.",
        ) from error
