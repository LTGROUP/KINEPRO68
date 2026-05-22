from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AuditLogCreate(BaseModel):
    actor_id: str
    actor_role: str
    action: str
    entity_type: str
    entity_id: str | None = None
    entity_role: str | None = None
    description: str
    metadata: dict[str, Any] = {}


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    actor_id: str | None = None
    actor_role: str
    action: str
    entity_type: str
    entity_id: str | None = None
    entity_role: str | None = None
    description: str
    metadata: dict[str, Any]
    created_at: datetime


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
