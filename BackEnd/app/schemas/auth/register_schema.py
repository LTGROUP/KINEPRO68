from datetime import date

from pydantic import BaseModel, EmailStr, field_validator


MINIMUM_AGE = 5


class RegisterRequest(BaseModel):
    nombre: str
    apellido: str
    dni: str
    telefono: str
    email: EmailStr
    obra_social: str
    fecha_nacimiento: date

    @field_validator("nombre")
    @classmethod
    def validate_nombre(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("El nombre debe tener al menos 3 caracteres")
        return value

    @field_validator("apellido")
    @classmethod
    def validate_apellido(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("El apellido debe tener al menos 3 caracteres")
        return value

    @field_validator("dni")
    @classmethod
    def validate_dni(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 7 or len(value) > 8:
            raise ValueError("El DNI debe tener entre 7 y 8 numeros")
        if not value.isdigit():
            raise ValueError("El DNI debe contener solo numeros")
        return value

    @field_validator("obra_social")
    @classmethod
    def validate_obra_social(cls, value: str) -> str:
        value = value.strip()
        return value or "Sin obra social"

    @field_validator("fecha_nacimiento")
    @classmethod
    def validate_fecha_nacimiento(cls, value: date) -> date:
        today = date.today()

        if value > today:
            raise ValueError("La fecha de nacimiento no puede ser futura")

        age = today.year - value.year
        # Si todavia no cumplio anos este ano, se descuenta uno.
        birthday_already_passed = (today.month, today.day) >= (value.month, value.day)

        if not birthday_already_passed:
            age -= 1

        if age < MINIMUM_AGE:
            raise ValueError("La persona debe tener al menos 5 anos")

        return value

class RegisterResponse(BaseModel):
    message: str
    user_id: str
    rol: str
