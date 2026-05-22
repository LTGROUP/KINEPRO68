from app.integrations.supabase.client import get_supabase_admin_client
from app.schemas.audit.audit_schema import AuditLogCreate


def create_audit_log(data: AuditLogCreate) -> dict:
    response = (
        get_supabase_admin_client()
        .table("audit_logs")
        .insert(data.model_dump())
        .execute()
    )
    return response.data[0]


def list_audit_logs(limit: int = 50) -> list[dict]:
    response = (
        get_supabase_admin_client()
        .table("audit_logs")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data
