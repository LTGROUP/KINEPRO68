from app.integrations.supabase.client import get_supabase_admin_client
from app.schemas.auth.profile_schema import ProfileUpdateRequest


def get_user_profile(user_id: str) -> dict:
    response = (
        get_supabase_admin_client()
        .table("profiles")
        .select(
            "id,nombre,apellido,dni,telefono,email,obra_social,fecha_nacimiento,rol"
        )
        .eq("id", user_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        return {"error": "Usuario no encontrado"}

    return response.data[0]


def update_user_profile(user_id: str, data: ProfileUpdateRequest) -> dict:
    existing = get_user_profile(user_id)
    if "error" in existing:
        return existing

    # Evita colisiones si se cambia a un email ya usado por otro usuario.
    email_owner = (
        get_supabase_admin_client()
        .table("profiles")
        .select("id")
        .eq("email", str(data.email))
        .limit(1)
        .execute()
    )
    if email_owner.data and email_owner.data[0]["id"] != user_id:
        return {"error": "El email ingresado ya pertenece a un usuario registrado"}

    fields = data.model_dump()
    fields["email"] = str(data.email)
    fields["fecha_nacimiento"] = data.fecha_nacimiento.isoformat()

    get_supabase_admin_client().table("profiles").update(fields).eq("id", user_id).execute()
    get_supabase_admin_client().auth.admin.update_user_by_id(
        user_id,
        {"email": str(data.email)},
    )

    updated_profile = get_user_profile(user_id)
    return updated_profile
