from app.integrations.supabase.client import get_supabase_admin_client


def get_first_result(response, error_message: str) -> dict:
    if not response.data:
        raise RuntimeError(error_message)

    return response.data[0]


def create_session_note_record(data: dict) -> dict:
    response = (
        get_supabase_admin_client()
        .table("anotaciones_sesion")
        .insert(data)
        .execute()
    )

    return get_first_result(response, "No se pudo registrar la sesión")


def get_session_notes_by_patient_id(patient_id: str) -> list[dict]:
    response = (
        get_supabase_admin_client()
        .table("anotaciones_sesion")
        .select("*")
        .eq("paciente_id", patient_id)
        .order("fecha_sesion", desc=True)
        .order("creada_en", desc=True)
        .execute()
    )

    return response.data
