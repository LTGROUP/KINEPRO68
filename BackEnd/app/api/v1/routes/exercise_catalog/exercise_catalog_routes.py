from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies.auth import get_current_professional_profile
from app.schemas.exercise_catalog.exercise_catalog_schema import (
    ExerciseCatalogListResponse,
)
from app.services.exercise_catalog.exercise_catalog_service import (
    get_exercise_catalog,
)


router = APIRouter(prefix="/exercise-catalog", tags=["exercise-catalog"])


@router.get("", response_model=ExerciseCatalogListResponse)
def get_catalog(
    search: str = Query(default="", max_length=100),
    area: str = Query(default=""),
    zone: str = Query(default="", max_length=100),
    limit: int = Query(default=500, ge=1, le=1000),
    current_profile: dict = Depends(get_current_professional_profile),
) -> ExerciseCatalogListResponse:
    del current_profile

    try:
        return get_exercise_catalog(
            search=search,
            area=area,
            zone=zone,
            limit=limit,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo obtener el catálogo de ejercicios",
        ) from error
