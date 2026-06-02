from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class PatientBase(BaseModel):
    nombre: str
    apellido: str
    dni: str
    telefono: str
    email: EmailStr
    fecha_nacimiento: date
    obra_social: str = "Sin obra social"

    @field_validator("nombre", "apellido")
    @classmethod
    def validate_nombre_apellido(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Debe tener al menos 3 caracteres")
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
        if value > date.today():
            raise ValueError("La fecha de nacimiento no puede ser futura")
        return value


class PatientCreateRequest(PatientBase):
    pass


class PatientUpdateRequest(BaseModel):
    nombre: str | None = None
    apellido: str | None = None
    telefono: str | None = None
    email: EmailStr | None = None
    fecha_nacimiento: date | None = None
    obra_social: str | None = None

    @field_validator("nombre", "apellido")
    @classmethod
    def validate_nombre_apellido(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Debe tener al menos 3 caracteres")
        return value

    @field_validator("obra_social")
    @classmethod
    def validate_obra_social(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        return value or "Sin obra social"

    @field_validator("fecha_nacimiento")
    @classmethod
    def validate_fecha_nacimiento(cls, value: date | None) -> date | None:
        if value is None:
            return value
        if value > date.today():
            raise ValueError("La fecha de nacimiento no puede ser futura")
        return value


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre: str
    apellido: str
    dni: str
    telefono: str
    email: EmailStr
    fecha_nacimiento: date
    obra_social: str
    rol: str
    activo: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: str | None = None
    updated_by: str | None = None


class PatientListResponse(BaseModel):
    items: list[PatientResponse]
    total: int
