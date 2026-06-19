from app.integrations.supabase.client import get_supabase_admin_client


def get_first_result(response, error_message: str) -> dict:
    if not response.data:
        raise RuntimeError(error_message)

    return response.data[0]


def create_medical_record_record(data: dict) -> dict:
    response = (
        get_supabase_admin_client()
        .table("fichas_medicas")
        .insert(data)
        .execute()
    )

    return get_first_result(response, "No se pudo crear la ficha médica")


def get_medical_record_by_patient_id(patient_id: str) -> dict | None:
    response = (
        get_supabase_admin_client()
        .table("fichas_medicas")
        .select("*")
        .eq("paciente_id", patient_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]


def get_medical_record_by_id(record_id: str) -> dict | None:
    response = (
        get_supabase_admin_client()
        .table("fichas_medicas")
        .select("*")
        .eq("id", record_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return get_first_result(response, "No se pudo actualizar la ficha médica")


def update_medical_record_record(record_id: str, data: dict) -> dict:
    response = (
        get_supabase_admin_client()
        .table("fichas_medicas")
        .update(data)
        .eq("id", record_id)
        .execute()
    )

    return response.data[0]


def create_complementary_studies(records: list[dict]) -> list[dict]:
    if not records:
        return []

    response = (
        get_supabase_admin_client()
        .table("estudios_complementarios")
        .insert(records)
        .execute()
    )

    if not response.data:
        raise RuntimeError("No se pudieron guardar los estudios complementarios")

    return response.data


def get_complementary_studies_by_record_id(record_id: str) -> list[dict]:
    response = (
        get_supabase_admin_client()
        .table("estudios_complementarios")
        .select("*")
        .eq("ficha_medica_id", record_id)
        .order("creado_en")
        .execute()
    )

    return response.data


def delete_complementary_studies_by_record_id(record_id: str) -> None:
    (
        get_supabase_admin_client()
        .table("estudios_complementarios")
        .delete()
        .eq("ficha_medica_id", record_id)
        .execute()
    )


def delete_medical_record_record(record_id: str) -> None:
    (
        get_supabase_admin_client()
        .table("fichas_medicas")
        .delete()
        .eq("id", record_id)
        .execute()
    )
