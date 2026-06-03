from app.integrations.supabase.client import get_supabase_admin_client
from app.schemas.staff_management.staff_schema import StaffCreateRequest, StaffUpdateRequest


STAFF_ROLES = ("profesional", "secretaria", "administrativo")


def normalize_professional_relation(professional_data) -> dict | None:
    if not professional_data:
        return None

    if isinstance(professional_data, list):
        if professional_data:
            return professional_data[0]
        return None

    return professional_data


def format_time_for_database(value) -> str | None:
    if value is None:
        return None

    if hasattr(value, "isoformat"):
        return value.isoformat()

    return str(value)


def row_to_staff(row: dict | None) -> dict | None:
    if not row:
        return None

    staff = dict(row)
    professional = normalize_professional_relation(staff.pop("professional_profiles", None))
    staff["profesional"] = None

    if professional:
        staff["profesional"] = {
            "matricula": professional.get("matricula"),
            "especialidad": professional.get("especialidad"),
            "area_tratamiento": professional.get("area_tratamiento"),
            "horario_entrada": professional.get("horario_entrada"),
            "horario_salida": professional.get("horario_salida"),
        }

    staff["activo"] = bool(staff.get("activo", True))

    return staff


def staff_select_columns() -> str:
    return (
        "id,nombre,apellido,dni,telefono,email,fecha_nacimiento,obra_social,"
        "rol,activo,created_at,updated_at,created_by,updated_by,"
        "professional_profiles(matricula,especialidad,area_tratamiento,horario_entrada,horario_salida)"
    )


def get_staff_by_id(staff_id: str) -> dict | None:
    response = (
        get_supabase_admin_client()
        .table("profiles")
        .select(staff_select_columns())
        .eq("id", staff_id)
        .in_("rol", STAFF_ROLES)
        .limit(1)
        .execute()
    )
    row = None

    if response.data:
        row = response.data[0]

    return row_to_staff(row)


def get_staff_by_dni(dni: str) -> dict | None:
    response = (
        get_supabase_admin_client()
        .table("profiles")
        .select("*")
        .eq("dni", dni)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def get_staff_by_email(email: str) -> dict | None:
    response = (
        get_supabase_admin_client()
        .table("profiles")
        .select("*")
        .eq("email", email)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def get_professional_by_matricula(matricula: str) -> dict | None:
    response = (
        get_supabase_admin_client()
        .table("professional_profiles")
        .select("profile_id,matricula")
        .eq("matricula", matricula)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def list_staff_profiles(include_inactive: bool = False, rol: str | None = None) -> list[dict]:
    query = (
        get_supabase_admin_client()
        .table("profiles")
        .select(staff_select_columns())
        .in_("rol", STAFF_ROLES)
        .order("apellido")
        .order("nombre")
    )

    if not include_inactive:
        query = query.eq("activo", True)

    if rol:
        query = query.eq("rol", rol)

    response = query.execute()
    staff_list = []

    for row in response.data:
        staff = row_to_staff(row)
        if staff:
            staff_list.append(staff)

    return staff_list


def create_staff_profile(data: StaffCreateRequest, actor_id: str) -> str:
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
                "rol": data.rol,
            },
        }
    )
    staff_id = auth_response.user.id

    try:
        admin_client.table("profiles").insert(
            {
                "id": staff_id,
                "nombre": data.nombre,
                "apellido": data.apellido,
                "dni": data.dni,
                "telefono": data.telefono,
                "email": str(data.email),
                "obra_social": data.obra_social,
                "fecha_nacimiento": data.fecha_nacimiento.isoformat(),
                "rol": data.rol,
                "activo": True,
                "created_by": actor_id,
            }
        ).execute()

        if data.rol == "profesional":
            admin_client.table("professional_profiles").insert(
                {
                    "profile_id": staff_id,
                    "matricula": data.matricula,
                    "especialidad": data.especialidad,
                    "area_tratamiento": data.area_tratamiento,
                    "horario_entrada": format_time_for_database(data.horario_entrada),
                    "horario_salida": format_time_for_database(data.horario_salida),
                }
            ).execute()
    except Exception:
        admin_client.table("professional_profiles").delete().eq("profile_id", staff_id).execute()
        admin_client.table("profiles").delete().eq("id", staff_id).execute()
        admin_client.auth.admin.delete_user(staff_id)
        raise

    return staff_id


def upsert_professional_profile(
    staff_id: str,
    matricula: str,
    especialidad: str,
    area_tratamiento: str,
    horario_entrada,
    horario_salida,
) -> None:
    admin_client = get_supabase_admin_client()
    existing = (
        admin_client.table("professional_profiles")
        .select("profile_id")
        .eq("profile_id", staff_id)
        .limit(1)
        .execute()
    )

    values = {
        "matricula": matricula,
        "especialidad": especialidad,
        "area_tratamiento": area_tratamiento,
        "horario_entrada": format_time_for_database(horario_entrada),
        "horario_salida": format_time_for_database(horario_salida),
    }

    if existing.data:
        admin_client.table("professional_profiles").update(values).eq(
            "profile_id", staff_id
        ).execute()
        return

    values["profile_id"] = staff_id
    admin_client.table("professional_profiles").insert(values).execute()


def delete_professional_profile(staff_id: str) -> None:
    get_supabase_admin_client().table("professional_profiles").delete().eq(
        "profile_id", staff_id
    ).execute()


def update_staff_profile(
    staff_id: str,
    data: StaffUpdateRequest,
    actor_id: str,
    professional_data: dict | None,
) -> None:
    admin_client = get_supabase_admin_client()
    fields = data.model_dump(
        exclude_unset=True,
        exclude={
            "matricula",
            "especialidad",
            "area_tratamiento",
            "horario_entrada",
            "horario_salida",
        },
    )
    fields["updated_by"] = actor_id

    for field, value in fields.items():
        if field == "fecha_nacimiento" and value is not None:
            fields[field] = value.isoformat()

    if fields:
        admin_client.table("profiles").update(fields).eq("id", staff_id).execute()

    auth_updates = {}
    if data.email:
        auth_updates["email"] = str(data.email)

    metadata = {}

    if data.nombre is not None:
        metadata["nombre"] = data.nombre

    if data.apellido is not None:
        metadata["apellido"] = data.apellido

    if data.rol is not None:
        metadata["rol"] = data.rol

    if metadata:
        auth_updates["user_metadata"] = metadata

    if auth_updates:
        admin_client.auth.admin.update_user_by_id(staff_id, auth_updates)

    if professional_data:
        upsert_professional_profile(
            staff_id=staff_id,
            matricula=professional_data["matricula"],
            especialidad=professional_data["especialidad"],
            area_tratamiento=professional_data["area_tratamiento"],
            horario_entrada=professional_data["horario_entrada"],
            horario_salida=professional_data["horario_salida"],
        )
    elif data.rol and data.rol != "profesional":
        delete_professional_profile(staff_id)


def deactivate_staff_profile(staff_id: str, actor_id: str) -> None:
    admin_client = get_supabase_admin_client()
    delete_professional_profile(staff_id)
    admin_client.table("profiles").delete().eq("id", staff_id).execute()
    admin_client.auth.admin.delete_user(staff_id)
