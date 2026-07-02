from datetime import date

from pydantic import BaseModel, Field, field_validator


class SessionNoteCreateRequest(BaseModel):
    paciente_id: str
    fecha_sesion: date | None = None
    actividad_realizada: str = Field(min_length=1)
    evolucion: str = Field(min_length=1)

    @field_validator("fecha_sesion")
    @classmethod
    def validate_session_date(cls, value: date | None) -> date | None:
        if value and value != date.today():
            raise ValueError("Las sesiones solo pueden registrarse con la fecha de hoy")

        return value

    @field_validator("actividad_realizada", "evolucion")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        clean_value = value.strip()

        if not clean_value:
            raise ValueError("El campo no puede estar vacío")

        return clean_value


class SessionNoteResponse(BaseModel):
    id: str
    paciente_id: str
    profesional_id: str
    profesional_nombre: str
    fecha_sesion: date
    actividad_realizada: str
    evolucion: str
    creada_en: str | None = None
    actualizada_en: str | None = None


class SessionNoteListResponse(BaseModel):
    items: list[SessionNoteResponse]
    total: int
