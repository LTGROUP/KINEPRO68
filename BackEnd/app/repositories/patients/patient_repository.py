from app.integrations.supabase.client import get_supabase_admin_client
from app.schemas.patients.patient_schema import PatientCreateRequest, PatientUpdateRequest


def patient_select_columns() -> str:
    return (
        "id,nombre,apellido,dni,telefono,email,fecha_nacimiento,obra_social,"
        "rol,activo,created_at,updated_at,created_by,updated_by"
    )


def row_to_patient(row: dict | None) -> dict | None:
    if not row:
        return None

    patient = dict(row)
    patient["activo"] = bool(patient.get("activo", True))
    return patient


def get_patient_by_id(patient_id: str) -> dict | None:
    response = (
        get_supabase_admin_client()
        .table("profiles")
        .select(patient_select_columns())
        .eq("id", patient_id)
        .eq("rol", "paciente")
        .limit(1)
        .execute()
    )
    row = None

    if response.data:
        row = response.data[0]

    return row_to_patient(row)


def get_patient_by_dni(dni: str) -> dict | None:
    response = (
        get_supabase_admin_client()
        .table("profiles")
        .select("*")
        .eq("dni", dni)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def get_patient_by_email(email: str) -> dict | None:
    response = (
        get_supabase_admin_client()
        .table("profiles")
        .select("*")
        .eq("email", email)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def list_patient_profiles(include_inactive: bool = False) -> list[dict]:
    query = (
        get_supabase_admin_client()
        .table("profiles")
        .select(patient_select_columns())
        .eq("rol", "paciente")
        .order("apellido")
        .order("nombre")
    )

    if not include_inactive:
        query = query.eq("activo", True)

    response = query.execute()
    patients = []

    for row in response.data:
        patient = row_to_patient(row)

        if patient:
            patients.append(patient)

    return patients


def create_patient_profile(data: PatientCreateRequest, actor_id: str) -> str:
    admin_client = get_supabase_admin_client()
    auth_response = admin_client.auth.admin.create_user(
        {
            "email": str(data.email),
            "password": data.dni,
            "email_confirm": True,
            "user_metadata": {
                "nombre": data.nombre,
                "apellido": data.apellido,
                "dni": data.dni,
                "rol": "paciente",
            },
        }
    )
    patient_id = auth_response.user.id

    try:
        admin_client.table("profiles").insert(
            {
                "id": patient_id,
                "nombre": data.nombre,
                "apellido": data.apellido,
                "dni": data.dni,
                "telefono": data.telefono,
                "email": str(data.email),
                "obra_social": data.obra_social,
                "fecha_nacimiento": data.fecha_nacimiento.isoformat(),
                "rol": "paciente",
                "activo": True,
                "created_by": actor_id,
            }
        ).execute()
    except Exception:
        admin_client.table("profiles").delete().eq("id", patient_id).execute()
        admin_client.auth.admin.delete_user(patient_id)
        raise

    return patient_id


def update_patient_profile(
    patient_id: str,
    data: PatientUpdateRequest,
    actor_id: str,
) -> None:
    admin_client = get_supabase_admin_client()
    fields = data.model_dump(exclude_unset=True)
    fields["updated_by"] = actor_id

    for field, value in fields.items():
        if field == "fecha_nacimiento" and value is not None:
            fields[field] = value.isoformat()

    if fields:
        admin_client.table("profiles").update(fields).eq("id", patient_id).execute()

    auth_updates = {}
    if data.email:
        auth_updates["email"] = str(data.email)

    metadata = {}

    if data.nombre is not None:
        metadata["nombre"] = data.nombre

    if data.apellido is not None:
        metadata["apellido"] = data.apellido

    if metadata:
        auth_updates["user_metadata"] = metadata

    if auth_updates:
        admin_client.auth.admin.update_user_by_id(patient_id, auth_updates)
