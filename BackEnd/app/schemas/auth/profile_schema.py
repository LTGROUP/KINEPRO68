from datetime import date

from pydantic import BaseModel, EmailStr, Field

# ==================== ESQUEMA PARA DATOS DEL PERFIL ====================

class ProfileResponse(BaseModel):
    """
    Datos del usuario que se devuelven al frontend cuando consulta su perfil.
    No se incluye la contraseña por seguridad.
    """
    id: str
    nombre: str
    apellido: str
    dni: str
    telefono: str
    email: str
    obra_social: str
    fecha_nacimiento: str
    rol: str


class ProfileUpdateRequest(BaseModel):
    nombre: str = Field(..., min_length=1)
    apellido: str = Field(..., min_length=1)
    telefono: str = Field(..., min_length=1)
    email: EmailStr
    obra_social: str = Field(..., min_length=1)
    fecha_nacimiento: date
