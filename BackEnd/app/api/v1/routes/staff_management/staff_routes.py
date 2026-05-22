from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies.auth import get_current_staff_manager_profile
from app.schemas.staff_management.staff_schema import (
    StaffActionResponse,
    StaffCreateRequest,
    StaffListResponse,
    StaffResponse,
    StaffUpdateRequest,
)
from app.services.staff_management.staff_service import (
    create_staff,
    deactivate_staff,
    get_staff_detail,
    list_staff,
    update_staff,
)


router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("", response_model=StaffListResponse)
def get_staff_list(
    current_profile: dict = Depends(get_current_staff_manager_profile),
    include_inactive: bool = Query(default=False),
    rol: str | None = Query(default=None),
) -> StaffListResponse:
    try:
        return list_staff(
            actor_role=current_profile["rol"],
            include_inactive=include_inactive,
            rol=rol,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo obtener el listado del personal. Revisá la relación entre profiles y professional_profiles.",
        ) from error


@router.get("/{staff_id}", response_model=StaffResponse)
def get_staff_detail_route(
    staff_id: str,
    current_profile: dict = Depends(get_current_staff_manager_profile),
) -> StaffResponse:
    try:
        return get_staff_detail(staff_id=staff_id, actor_role=current_profile["rol"])
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo obtener el detalle del miembro.",
        ) from error


@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
def post_staff(
    data: StaffCreateRequest,
    current_profile: dict = Depends(get_current_staff_manager_profile),
) -> StaffResponse:
    try:
        return create_staff(
            data,
            actor_role=current_profile["rol"],
            actor_id=current_profile["id"],
            actor_dni=current_profile["dni"],
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo registrar el miembro. Revisá que los datos sean válidos y que la tabla professional_profiles esté actualizada.",
        ) from error


@router.patch("/{staff_id}", response_model=StaffResponse)
def patch_staff(
    staff_id: str,
    data: StaffUpdateRequest,
    current_profile: dict = Depends(get_current_staff_manager_profile),
) -> StaffResponse:
    try:
        return update_staff(
            staff_id=staff_id,
            data=data,
            actor_role=current_profile["rol"],
            actor_id=current_profile["id"],
            actor_dni=current_profile["dni"],
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo actualizar el miembro. Revisá que los datos sean válidos.",
        ) from error


@router.delete("/{staff_id}", response_model=StaffActionResponse)
def delete_staff(
    staff_id: str,
    current_profile: dict = Depends(get_current_staff_manager_profile),
) -> StaffActionResponse:
    try:
        return deactivate_staff(
            staff_id=staff_id,
            actor_role=current_profile["rol"],
            actor_id=current_profile["id"],
            actor_dni=current_profile["dni"],
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo dar de baja el miembro.",
        ) from error
