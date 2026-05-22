from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies.auth import get_current_staff_manager_profile
from app.schemas.audit.audit_schema import AuditLogListResponse
from app.services.audit.audit_service import list_audit


router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=AuditLogListResponse)
def get_audit_logs(
    current_profile: dict = Depends(get_current_staff_manager_profile),
    limit: int = Query(default=50, ge=1, le=100),
) -> AuditLogListResponse:
    try:
        return list_audit(actor_role=current_profile["rol"], limit=limit)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo obtener el registro de auditoria.",
        ) from error
