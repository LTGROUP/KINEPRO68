import re

from app.integrations.supabase.client import (
    get_supabase_admin_client,
    get_supabase_auth_client,
)


def get_profile_by_id(user_id: str):
    response = (
        get_supabase_admin_client()
        .table("profiles")
        .select("id,email")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]


def current_password_is_valid(email: str, current_password: str):
    try:
        get_supabase_auth_client().auth.sign_in_with_password(
            {
                "email": email,
                "password": current_password,
            }
        )
        return True
    except Exception:
        return False


def change_password(user_id: str, current_password: str, new_password: str):
    # Validaciones de la nueva contraseña
    if len(new_password) < 8:
        return {"error": "La contraseña debe tener mínimo 8 caracteres"}
    if not re.search(r"[A-Z]", new_password):
        return {"error": "La contraseña debe tener al menos una letra mayúscula"}
    if not re.search(r"[0-9]", new_password):
        return {"error": "La contraseña debe tener al menos un número"}

    if current_password == new_password:
        return {"error": "La nueva contraseña no puede ser igual a la actual"}

    profile = get_profile_by_id(user_id)
    if not profile:
        return {"error": "Usuario no encontrado"}

    email = profile["email"]

    if not current_password_is_valid(email, current_password):
        return {"error": "Contraseña actual incorrecta"}

    get_supabase_admin_client().auth.admin.update_user_by_id(
        user_id,
        {"password": new_password},
    )

    return {"message": "Contraseña cambiada con éxito"}
