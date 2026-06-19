from pydantic import BaseModel, Field


class ExerciseCatalogResponse(BaseModel):
    id: str
    nombre: str
    area_tratamiento: str
    zona_muscular: str
    activo: bool


class ExerciseCatalogListResponse(BaseModel):
    items: list[ExerciseCatalogResponse] = Field(default_factory=list)
    total: int
