from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies.auth import get_current_professional_profile
from app.schemas.session_notes.session_note_schema import (
    SessionNoteCreateRequest,
    SessionNoteListResponse,
    SessionNoteResponse,
)
from app.services.session_notes.session_note_service import (
    create_session_note,
    list_session_notes_by_patient,
)

router = APIRouter(prefix="/session-notes", tags=["session-notes"])


@router.get("/patient/{patient_id}", response_model=SessionNoteListResponse)
def get_patient_session_notes(
    patient_id: str,
    current_profile: dict = Depends(get_current_professional_profile),
) -> SessionNoteListResponse:
    try:
        return list_session_notes_by_patient(patient_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo obtener el historial clínico.",
        ) from error


@router.post("", response_model=SessionNoteResponse, status_code=status.HTTP_201_CREATED)
def post_session_note(
    data: SessionNoteCreateRequest,
    current_profile: dict = Depends(get_current_professional_profile),
) -> SessionNoteResponse:
    try:
        return create_session_note(data, current_profile)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar la sesión.",
        ) from error
