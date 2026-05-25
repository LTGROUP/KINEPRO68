import re

from pydantic import BaseModel, Field, field_validator

# ==================== ESQUEMA PARA RESETEAR CONTRASEÑA CON TOKEN ====================

class ResetPasswordRequest(BaseModel):
    """
    Datos que el frontend debe enviar al endpoint /auth/reset-password.
    El usuario recibe el token por email (simulado) y lo ingresa junto con su nueva contraseña.
    """
    token: str = Field(..., min_length=1)         # Token único que llegó por email (simulado)
    new_password: str = Field(..., min_length=1)  # Nueva contraseña que quiere establecer

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener mínimo 8 caracteres")
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe tener al menos una letra mayúscula")
        if not re.search(r"[0-9]", v):
            raise ValueError("La contraseña debe tener al menos un número")
        return v


class ResetPasswordResponse(BaseModel):
    """
    Respuesta que el backend devuelve después de resetear la contraseña.
    """
    message: str        # Mensaje de éxito o error

    
