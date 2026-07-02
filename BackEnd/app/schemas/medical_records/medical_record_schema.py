from datetime import date

from pydantic import BaseModel, Field, field_validator


class ComplementaryStudyRequest(BaseModel):
    tipo_estudio: str = Field(min_length=1)
    fecha_estudio: date | None = None
    observaciones: str | None = None
    archivo_url: str | None = None

    @field_validator("fecha_estudio")
    @classmethod
    def validate_study_date(cls, value: date | None) -> date | None:
        if value and value > date.today():
            raise ValueError("La fecha del estudio no puede ser futura")

        return value


class ComplementaryStudyResponse(BaseModel):
    id: str
    ficha_medica_id: str
    tipo_estudio: str
    fecha_estudio: date | None = None
    observaciones: str | None = None
    archivo_url: str | None = None
    creado_en: str | None = None


class MedicalRecordCreateRequest(BaseModel):
    paciente_id: str

    motivo_consulta: str | None = None
    diagnostico_medico: str | None = None
    zona_afectada: str | None = None
    fecha_inicio_lesion: str | None = None

    cirugias_relevantes: str | None = None
    enfermedades_relevantes: str | None = None
    medicacion_actual: str | None = None
    alergias: str | None = None

    ocupacion: str | None = None
    actividad_fisica: str | None = None

    estudios: list[ComplementaryStudyRequest] = Field(default_factory=list)

class MedicalRecordUpdateRequest(BaseModel):
    motivo_consulta: str | None = None
    diagnostico_medico: str | None = None
    zona_afectada: str | None = None
    fecha_inicio_lesion: str | None = None

    cirugias_relevantes: str | None = None
    enfermedades_relevantes: str | None = None
    medicacion_actual: str | None = None
    alergias: str | None = None

    ocupacion: str | None = None
    actividad_fisica: str | None = None

    estudios: list[ComplementaryStudyRequest] = Field(default_factory=list)

class MedicalRecordResponse(BaseModel):
    id: str
    paciente_id: str

    motivo_consulta: str | None = None
    diagnostico_medico: str | None = None
    zona_afectada: str | None = None
    fecha_inicio_lesion: str | None = None

    cirugias_relevantes: str | None = None
    enfermedades_relevantes: str | None = None
    medicacion_actual: str | None = None
    alergias: str | None = None

    ocupacion: str | None = None
    actividad_fisica: str | None = None

    creada_en: str | None = None
    actualizada_en: str | None = None

    estudios: list[ComplementaryStudyResponse] = Field(default_factory=list)
