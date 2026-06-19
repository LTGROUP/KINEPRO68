from app.integrations.supabase.client import get_supabase_admin_client


def get_first_result(response, error_message: str) -> dict:
    if not response.data:
        raise RuntimeError(error_message)

    return response.data[0]


def create_routine_record(data: dict) -> dict:
    response = (
        get_supabase_admin_client()
        .table("rutinas")
        .insert(data)
        .execute()
    )

    return get_first_result(response, "No se pudo crear la rutina")


def create_routine_exercises(records: list[dict]) -> list[dict]:
    response = (
        get_supabase_admin_client()
        .table("rutina_ejercicios")
        .insert(records)
        .execute()
    )
    if not response.data:
        raise RuntimeError("No se pudieron crear los ejercicios de la rutina")

    return response.data


def get_active_routines_by_patient(patient_id: str) -> list[dict]:
    response = (
        get_supabase_admin_client()
        .table("rutinas")
        .select("*")
        .eq("paciente_id", patient_id)
        .eq("activa", True)
        .order("creada_en", desc=True)
        .execute()
    )
    return response.data


def get_routine_by_id(routine_id: str) -> dict | None:
    response = (
        get_supabase_admin_client()
        .table("rutinas")
        .select("*")
        .eq("id", routine_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]


def get_exercises_by_routine_id(routine_id: str) -> list[dict]:
    response = (
        get_supabase_admin_client()
        .table("rutina_ejercicios")
        .select("*")
        .eq("rutina_id", routine_id)
        .order("orden")
        .execute()
    )
    return response.data


def update_routine_record(routine_id: str, data: dict) -> dict:
    response = (
        get_supabase_admin_client()
        .table("rutinas")
        .update(data)
        .eq("id", routine_id)
        .execute()
    )
    return get_first_result(response, "No se pudo actualizar la rutina")


def delete_exercises_by_routine_id(routine_id: str) -> None:
    (
        get_supabase_admin_client()
        .table("rutina_ejercicios")
        .delete()
        .eq("rutina_id", routine_id)
        .execute()
    )


def deactivate_routine_record(routine_id: str) -> dict:
    response = (
        get_supabase_admin_client()
        .table("rutinas")
        .update({"activa": False})
        .eq("id", routine_id)
        .execute()
    )
    return get_first_result(response, "No se pudo eliminar la rutina")


def deactivate_active_routines_by_patient(patient_id: str) -> None:
    (
        get_supabase_admin_client()
        .table("rutinas")
        .update({"activa": False})
        .eq("paciente_id", patient_id)
        .eq("activa", True)
        .execute()
    )


def deactivate_other_active_routines_by_patient(
    patient_id: str,
    active_routine_id: str,
) -> None:
    (
        get_supabase_admin_client()
        .table("rutinas")
        .update({"activa": False})
        .eq("paciente_id", patient_id)
        .eq("activa", True)
        .neq("id", active_routine_id)
        .execute()
    )


def delete_routine_record(routine_id: str) -> None:
    (
        get_supabase_admin_client()
        .table("rutinas")
        .delete()
        .eq("id", routine_id)
        .execute()
    )
