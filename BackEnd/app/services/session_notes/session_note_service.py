from datetime import date

from app.repositories.patients.patient_repository import get_patient_by_id
from app.repositories.session_notes.session_note_repository import (
    create_session_note_record,
    get_session_notes_by_patient_id,
)
from app.schemas.session_notes.session_note_schema import (
    SessionNoteCreateRequest,
    SessionNoteListResponse,
    SessionNoteResponse,
)


def build_professional_name(profile: dict) -> str:
    full_name = f"{profile.get('nombre', '')} {profile.get('apellido', '')}".strip()

    if full_name:
        return full_name

    return profile.get("email", "Profesional")


def build_session_note_response(note: dict, professional_name: str | None = None) -> SessionNoteResponse:
    return SessionNoteResponse(
        id=note["id"],
        paciente_id=note["paciente_id"],
        profesional_id=note["profesional_id"],
        profesional_nombre=professional_name or note.get("profesional_nombre") or "Profesional",
        fecha_sesion=note["fecha_sesion"],
        actividad_realizada=note["actividad_realizada"],
        evolucion=note["evolucion"],
        creada_en=note.get("creada_en"),
        actualizada_en=note.get("actualizada_en"),
    )


def list_session_notes_by_patient(patient_id: str) -> SessionNoteListResponse:
    patient = get_patient_by_id(patient_id)

    if not patient:
        raise ValueError("El paciente indicado no existe")

    notes = get_session_notes_by_patient_id(patient_id)
    items = [build_session_note_response(note) for note in notes]

    return SessionNoteListResponse(items=items, total=len(items))


def create_session_note(
    data: SessionNoteCreateRequest,
    current_profile: dict,
) -> SessionNoteResponse:
    patient = get_patient_by_id(data.paciente_id)

    if not patient:
        raise ValueError("El paciente indicado no existe")

    professional_name = build_professional_name(current_profile)
    note = create_session_note_record(
        {
            "paciente_id": data.paciente_id,
            "profesional_id": current_profile["id"],
            "profesional_nombre": professional_name,
            "fecha_sesion": date.today().isoformat(),
            "actividad_realizada": data.actividad_realizada.strip(),
            "evolucion": data.evolucion.strip(),
        },
    )

    return build_session_note_response(note, professional_name)
