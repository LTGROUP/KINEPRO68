from pydantic import BaseModel, EmailStr

# ==================== ESQUEMA PARA SOLICITUD DE RECUPERACIÓN ====================

class ForgotPasswordRequest(BaseModel):
    """
    Datos que el frontend debe enviar al endpoint /auth/forgot-password.
    Solo necesita el email del usuario que olvidó su contraseña.
    """
    email: EmailStr  # Email del usuario registrado


class ForgotPasswordResponse(BaseModel):
    """
    Respuesta que el backend devuelve después de procesar la solicitud.
    No se devuelve ningun token al frontend.
    """
    message: str  # Mensaje de éxito o error

    
