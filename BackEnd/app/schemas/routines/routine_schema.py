from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class RoutineExerciseRequest(BaseModel):
    ejercicio_catalogo_id: str | None = None
    nombre: str = Field(min_length=1)
    area_tratamiento: Literal["tren_superior", "tren_medio", "tren_inferior"]
    zona_muscular: str = Field(min_length=1)
    series: int = Field(ge=1)
    repeticiones: int = Field(ge=1)
    descanso: str = Field(min_length=1)
    observaciones: str | None = None
    orden: int = Field(ge=1)
    dia: int = Field(default=1, ge=1)
    bloque_orden: int = Field(default=1, ge=1)

    @field_validator("nombre", "zona_muscular", "descanso")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        clean_value = value.strip()

        if not clean_value:
            raise ValueError("El campo no puede estar vacío")

        return clean_value


class RoutineCreateRequest(BaseModel):
    paciente_id: str
    titulo: str = Field(min_length=1)
    frecuencia: str = Field(min_length=1)
    fecha_inicio: date
    fecha_fin: date
    indicaciones_generales: str | None = None
    ejercicios: list[RoutineExerciseRequest] = Field(min_length=1)

    @field_validator("titulo", "frecuencia")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        clean_value = value.strip()

        if not clean_value:
            raise ValueError("El campo no puede estar vacío")

        return clean_value


class RoutineUpdateRequest(BaseModel):
    titulo: str = Field(min_length=1)
    frecuencia: str = Field(min_length=1)
    fecha_inicio: date
    fecha_fin: date
    indicaciones_generales: str | None = None
    ejercicios: list[RoutineExerciseRequest] = Field(min_length=1)

    @field_validator("titulo", "frecuencia")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        clean_value = value.strip()

        if not clean_value:
            raise ValueError("El campo no puede estar vacío")

        return clean_value


class RoutineExerciseResponse(BaseModel):
    id: str
    rutina_id: str
    nombre: str
    ejercicio_catalogo_id: str | None = None
    area_tratamiento: str | None = None
    zona_muscular: str | None = None
    series: int = Field(ge=1)
    repeticiones: int = Field(ge=1)
    descanso: str | None = None
    observaciones: str | None = None
    orden: int = Field(ge=1)
    dia: int = Field(default=1, ge=1)
    bloque_orden: int = Field(default=1, ge=1)


class RoutineResponse(BaseModel):
    id: str
    paciente_id: str
    profesional_id: str
    titulo: str
    frecuencia: str | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    indicaciones_generales: str | None = None
    activa: bool
    creada_en: str | None = None
    actualizada_en: str | None = None
    ejercicios: list[RoutineExerciseResponse] = Field(default_factory=list)


class RoutineListResponse(BaseModel):
    items: list[RoutineResponse]
    total: int
