from pydantic import BaseModel, field_validator


class LoginRequest(BaseModel):
    dni: str
    password: str

    @field_validator("dni")
    @classmethod
    def validate_dni(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 7 or len(value) > 8:
            raise ValueError("El DNI debe tener entre 7 y 8 numeros")
        if not value.isdigit():
            raise ValueError("El DNI debe contener solo numeros")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not value:
            raise ValueError("La contrasena es obligatoria")
        return value


class LoginResponse(BaseModel):
    message: str
    user_id: str
    access_token: str
    refresh_token: str
    nombre: str
    apellido: str
    dni: str
    rol: str


class RefreshSessionRequest(BaseModel):
    refresh_token: str


class RefreshSessionResponse(BaseModel):
    message: str
    user_id: str
    access_token: str
    refresh_token: str
    nombre: str
    apellido: str
    dni: str
    rol: str
