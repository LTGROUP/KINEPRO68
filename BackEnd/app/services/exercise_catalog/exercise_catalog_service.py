from app.repositories.exercise_catalog.exercise_catalog_repository import (
    list_catalog_exercises,
)
from app.schemas.exercise_catalog.exercise_catalog_schema import (
    ExerciseCatalogListResponse,
    ExerciseCatalogResponse,
)


VALID_TREATMENT_AREAS = {
    "tren_superior",
    "tren_medio",
    "tren_inferior",
}


def get_exercise_catalog(
    search: str = "",
    area: str = "",
    zone: str = "",
    limit: int = 500,
) -> ExerciseCatalogListResponse:
    clean_search = search.strip()
    clean_area = area.strip()
    clean_zone = zone.strip()

    if clean_area and clean_area not in VALID_TREATMENT_AREAS:
        raise ValueError("El tren seleccionado no es válido")

    rows = list_catalog_exercises(
        search=clean_search,
        area=clean_area,
        zone=clean_zone,
        limit=limit,
    )
    items = []

    for row in rows:
        items.append(ExerciseCatalogResponse(**row))

    return ExerciseCatalogListResponse(items=items, total=len(items))
