from app.integrations.supabase.client import (
    get_supabase_admin_client,
    get_supabase_auth_client,
)
from app.schemas.auth.register_schema import RegisterRequest


def normalize_profile(row: dict | None) -> dict | None:
    if not row:
        return None

    profile = dict(row)
    profile["activo"] = bool(profile.get("activo", True))
    return profile


def get_profile_by_dni(dni: str) -> dict | None:
    response = (
        get_supabase_admin_client()
        .table("profiles")
        .select("*")
        .eq("dni", dni)
        .limit(1)
        .execute()
    )
    return normalize_profile(response.data[0] if response.data else None)


def get_profile_by_email(email: str) -> dict | None:
    response = (
        get_supabase_admin_client()
        .table("profiles")
        .select("*")
        .eq("email", email)
        .limit(1)
        .execute()
    )
    return normalize_profile(response.data[0] if response.data else None)


def create_auth_user(data: RegisterRequest) -> str:
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
    user_id = auth_response.user.id

    try:
        admin_client.table("profiles").insert(
            {
                "id": user_id,
                "nombre": data.nombre,
                "apellido": data.apellido,
                "dni": data.dni,
                "telefono": data.telefono,
                "email": str(data.email),
                "obra_social": data.obra_social,
                "fecha_nacimiento": data.fecha_nacimiento.isoformat(),
                "rol": "paciente",
                "activo": True,
            }
        ).execute()
    except Exception:
        # Si falla el perfil, evitamos dejar un usuario de Auth sin datos asociados.
        admin_client.auth.admin.delete_user(user_id)
        raise

    return user_id


def login_with_dni(dni: str, password: str) -> dict | None:
    profile = get_profile_by_dni(dni)

    if not profile:
        return None

    try:
        auth_response = get_supabase_auth_client().auth.sign_in_with_password(
            {
                "email": profile["email"],
                "password": password,
            }
        )
    except Exception as error:
        raise ValueError("El DNI o la contrasena son incorrectos") from error

    profile["access_token"] = auth_response.session.access_token
    profile["refresh_token"] = auth_response.session.refresh_token
    return profile


def refresh_auth_session(refresh_token: str) -> dict | None:
    try:
        auth_response = get_supabase_auth_client().auth.refresh_session(refresh_token)
    except Exception as error:
        raise ValueError("La sesion no se pudo renovar") from error

    if not auth_response.session:
        return None

    user_id = auth_response.user.id
    response = (
        get_supabase_admin_client()
        .table("profiles")
        .select("*")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    profile = response.data[0]
    profile["access_token"] = auth_response.session.access_token
    profile["refresh_token"] = auth_response.session.refresh_token
    return profile
