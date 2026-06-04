from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies.auth import get_current_patient_profile
from app.schemas.check_in import CheckInRequest, CheckInResponse
from app.services.check_in import register_check_in


router = APIRouter(prefix="/check-in", tags=["check-in"])


@router.post("", response_model=CheckInResponse)
def post_check_in(
    data: CheckInRequest,
    current_profile: dict = Depends(get_current_patient_profile),
) -> CheckInResponse:
    try:
        return register_check_in(data, current_profile)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo registrar la asistencia.",
        ) from error
