from pydantic import BaseModel, Field, field_validator
import re

PASSWORD_REQUIREMENTS_MESSAGE = (
    "No se cumplen los requisitos"
)

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=1)
    
    # Validador para la nueva contraseña
    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8 or not re.search(r"[A-Z]", v) or not re.search(r"[0-9]", v):
            raise ValueError(PASSWORD_REQUIREMENTS_MESSAGE)
        return v

class ChangePasswordResponse(BaseModel):
    message: str
