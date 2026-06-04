from typing import Any

from app.repositories.audit.audit_repository import create_audit_log, list_audit_logs
from app.schemas.audit.audit_schema import AuditLogCreate, AuditLogListResponse, AuditLogResponse


ALLOWED_AUDIT_ROLES = {"administrativo", "secretaria"}
SECRETARY_VISIBLE_ENTITY_ROLES = {"profesional", "paciente"}


def validate_audit_actor(actor_role: str) -> None:
    if actor_role not in ALLOWED_AUDIT_ROLES:
        raise ValueError("No tenes permisos para ver auditoria")


def build_audit_response(audit: dict) -> AuditLogResponse:
    return AuditLogResponse(
        id=audit["id"],
        actor_id=audit.get("actor_id"),
        actor_role=audit["actor_role"],
        action=audit["action"],
        entity_type=audit["entity_type"],
        entity_id=audit.get("entity_id"),
        entity_role=audit.get("entity_role"),
        description=audit["description"],
        metadata=audit["metadata"],
        created_at=audit["created_at"],
    )


def register_audit_log(
    actor_id: str,
    actor_role: str,
    action: str,
    entity_type: str,
    description: str,
    entity_id: str | None = None,
    entity_role: str | None = None,
    actor_dni: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditLogResponse | None:
    if metadata is None:
        final_metadata = {}
    else:
        final_metadata = metadata.copy()

    if actor_dni:
        final_metadata["actor_dni"] = actor_dni

    try:
        audit = create_audit_log(
            AuditLogCreate(
                actor_id=actor_id,
                actor_role=actor_role,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                entity_role=entity_role,
                description=description,
                metadata=final_metadata,
            )
        )
        return build_audit_response(audit)
    except Exception:
        # La auditoria no debe bloquear la accion principal si Supabase rechaza el log.
        return None


def list_audit(actor_role: str, limit: int = 50) -> AuditLogListResponse:
    actor_role = actor_role.strip().lower()
    validate_audit_actor(actor_role)

    logs = list_audit_logs(limit=limit)

    if actor_role == "secretaria":
        visible_logs = []

        for log in logs:
            if log.get("entity_role") in SECRETARY_VISIBLE_ENTITY_ROLES:
                visible_logs.append(log)

        logs = visible_logs

    items = []

    for log in logs:
        items.append(build_audit_response(log))

    return AuditLogListResponse(items=items, total=len(items))
