import os
import logging
from app.integrations.supabase.client import get_supabase_auth_client
from app.repositories.auth.supabase_auth_repository import get_profile_by_email


logger = logging.getLogger(__name__)
RECOVERY_RESPONSE = "Se envió un link de recuperación a la casilla del email correspondiente."

# ==================== SERVICIO DE RECUPERACIÓN DE CONTRASEÑA ====================

def forgot_password(email: str):
    """
    Servicio para solicitar recuperación de contraseña.
    1. Verifica que el email exista en Supabase.
    2. Le pide a Supabase Auth que envie el email de recuperacion.
    3. Si el email existe, devuelve una respuesta de envio.
    """
    
    # PASO 1: Verificar perfil en Supabase (fuente real de usuarios).
    user = get_profile_by_email(email)
    if not user:
        return {"error": "El email no corresponde a una cuenta registrada"}

    # PASO 2: Solicitar a Supabase que envíe email real de recuperación.
    app_login_url = os.getenv("APP_LOGIN_URL", "http://127.0.0.1:5173/").strip()
    try:
        get_supabase_auth_client().auth.reset_password_email(
            email,
            {"redirect_to": app_login_url},
        )
    except Exception as error:
        logger.exception("Error al solicitar recovery email en Supabase")
        return {"message": RECOVERY_RESPONSE}

    # PASO 3: Devolver mensaje simple para que el frontend muestre confirmacion.
    return {"message": RECOVERY_RESPONSE}
