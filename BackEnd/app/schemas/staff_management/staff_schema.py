from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator


StaffRole = Literal["profesional", "secretaria", "administrativo"]
TreatmentArea = Literal["tren superior", "tren medio", "tren inferior"]


def join_field_names(field_names: list[str]) -> str:
    text = ""

    for field_name in field_names:
        if text:
            text = text + ", "

        text = text + field_name

    return text


class StaffBase(BaseModel):
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

    @field_validator("telefono")
    @classmethod
    def validate_telefono(cls, value: str) -> str:
        value = value.strip()
        number = value

        if value.startswith("+"):
            number = value[1:]

        if len(value) < 8 or len(value) > 18:
            raise ValueError("El telefono debe tener entre 8 y 18 caracteres")
        if not number.isdigit():
            raise ValueError("El telefono debe contener numeros y puede comenzar con +")
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
        return value


class StaffCreateRequest(StaffBase):
    rol: StaffRole
    matricula: str | None = None
    especialidad: str | None = None
    area_tratamiento: TreatmentArea | None = None
    horario_entrada: time | None = None
    horario_salida: time | None = None

    @field_validator("matricula", "especialidad")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        return value or None

    @model_validator(mode="after")
    def validate_professional_data(self) -> "StaffCreateRequest":
        if self.rol == "profesional":
            missing_fields = []
            if not self.matricula:
                missing_fields.append("matricula")
            if not self.especialidad:
                missing_fields.append("especialidad")
            if not self.area_tratamiento:
                missing_fields.append("area_tratamiento")
            if not self.horario_entrada:
                missing_fields.append("horario_entrada")
            if not self.horario_salida:
                missing_fields.append("horario_salida")

            if missing_fields:
                fields = join_field_names(missing_fields)
                raise ValueError(f"Faltan datos obligatorios del profesional: {fields}")

            if self.horario_salida <= self.horario_entrada:
                raise ValueError("El horario de salida debe ser posterior al horario de entrada")

        return self


class StaffUpdateRequest(BaseModel):
    nombre: str | None = None
    apellido: str | None = None
    telefono: str | None = None
    email: EmailStr | None = None
    fecha_nacimiento: date | None = None
    obra_social: str | None = None
    rol: StaffRole | None = None
    matricula: str | None = None
    especialidad: str | None = None
    area_tratamiento: TreatmentArea | None = None
    horario_entrada: time | None = None
    horario_salida: time | None = None

    @field_validator("nombre", "apellido")
    @classmethod
    def validate_nombre_apellido(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Debe tener al menos 3 caracteres")
        return value

    @field_validator("telefono")
    @classmethod
    def validate_telefono(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        number = value

        if value.startswith("+"):
            number = value[1:]

        if len(value) < 8 or len(value) > 18:
            raise ValueError("El telefono debe tener entre 8 y 18 caracteres")
        if not number.isdigit():
            raise ValueError("El telefono debe contener numeros y puede comenzar con +")
        return value

    @field_validator("obra_social", "matricula", "especialidad")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        return value or None

    @field_validator("fecha_nacimiento")
    @classmethod
    def validate_fecha_nacimiento(cls, value: date | None) -> date | None:
        if value is None:
            return value
        if value > date.today():
            raise ValueError("La fecha de nacimiento no puede ser futura")
        return value


class ProfessionalDataResponse(BaseModel):
    matricula: str | None = None
    especialidad: str | None = None
    area_tratamiento: str | None = None
    horario_entrada: time | None = None
    horario_salida: time | None = None


class StaffResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre: str
    apellido: str
    dni: str
    telefono: str
    email: EmailStr
    fecha_nacimiento: date
    obra_social: str
    rol: StaffRole
    activo: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: str | None = None
    updated_by: str | None = None
    profesional: ProfessionalDataResponse | None = None


class StaffListResponse(BaseModel):
    items: list[StaffResponse]
    total: int


class StaffActionResponse(BaseModel):
    message: str
    staff_id: str
