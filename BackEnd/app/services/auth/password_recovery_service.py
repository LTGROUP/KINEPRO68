import os
import logging
from datetime import datetime, timezone
from app.db.user_repository import (
    get_user_by_email,
    get_reset_token,
    hash_password_for_local_db,
    mark_token_as_used,
    update_user_password,
    verify_password_for_local_db,
)
from app.integrations.supabase.client import get_supabase_auth_client
from app.repositories.auth.supabase_auth_repository import get_profile_by_email
from supabase_auth.errors import AuthApiError


logger = logging.getLogger(__name__)

# ==================== SERVICIO DE RECUPERACIÓN DE CONTRASEÑA ====================

def build_recovery_error_message(error: Exception) -> str:
    """
    Traduce errores comunes de Supabase a mensajes simples para mostrar en pantalla.
    """
    error_text = str(error).lower()

    if "rate limit" in error_text or "security purposes" in error_text:
        return "Ya se envió un email recientemente. Esperá unos minutos e intentá de nuevo."

    if "redirect" in error_text or "not allowed" in error_text:
        return "La URL de recuperación no está habilitada en Supabase."

    if "smtp" in error_text or "email provider" in error_text or "send" in error_text:
        return "No se pudo enviar el email. Revisá la configuración SMTP en Supabase."

    return "No se pudo procesar la solicitud de recuperación."


def forgot_password(email: str):
    """
    Servicio para solicitar recuperación de contraseña.
    1. Verifica que el email exista en la base de datos
    2. Genera un token único
    3. Guarda el token con expiración de 15 minutos
    4. Simula envío de email (muestra el link en consola)
    """
    
    # PASO 1: Verificar perfil en Supabase (fuente real de usuarios).
    user = get_profile_by_email(email)
    if not user:
        # Respuesta uniforme para evitar enumeración de cuentas.
        return {"message": "Si el email está registrado, recibirás un enlace de recuperación"}

    # PASO 2: Solicitar a Supabase que envíe email real de recuperación.
    app_login_url = os.getenv("APP_LOGIN_URL", "http://127.0.0.1:5173/")
    try:
        get_supabase_auth_client().auth.reset_password_email(
            email,
            {"redirect_to": app_login_url},
        )
    except AuthApiError as error:
        logger.exception("Error al solicitar recovery email en Supabase")
        return {"error": build_recovery_error_message(error)}
    except Exception as error:
        logger.exception("Error inesperado al solicitar recovery email")
        return {"error": build_recovery_error_message(error)}

    # PASO 3: Devolver mensaje genérico (no decimos si el email existe o no por seguridad)
    return {"message": "Si el email está registrado, recibirás un enlace de recuperación"}


def reset_password(token: str, new_password: str):
    """
    Servicio para resetear la contraseña usando un token.
    1. Verifica que el token exista y no haya sido usado
    2. Verifica que el token no haya expirado
    3. Busca el usuario por el email asociado al token
    4. Valida la nueva contraseña
    5. Actualiza la contraseña en la base de datos
    6. Marca el token como usado
    """
    
    # PASO 1: Buscar el token en la base de datos
    token_record = get_reset_token(token)
    if not token_record:
        return {"error": "Token inválido o ya utilizado"}
    
    # PASO 2: Verificar que el token no haya expirado
    expires_at = datetime.fromisoformat(token_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        return {"error": "El token ha expirado. Solicita un nuevo enlace"}
    
    # PASO 3: Buscar al usuario por el email asociado al token
    user = get_user_by_email(token_record["email"])
    if not user:
        return {"error": "Usuario no encontrado"}
    
    # PASO 4: Validar que la nueva contraseña sea diferente a la actual
    if verify_password_for_local_db(new_password, user["password"]):
        return {"error": "La nueva contraseña no puede ser igual a la actual"}
    
    # PASO 5: Hashear y guardar la nueva contraseña
    hashed_password = hash_password_for_local_db(new_password)
    update_user_password(user["id"], hashed_password)
    
    # PASO 6: Marcar el token como usado (no se puede reutilizar)
    mark_token_as_used(token)
    
    # PASO 7: Devolver éxito
    return {"message": "Contraseña actualizada con éxito"}
