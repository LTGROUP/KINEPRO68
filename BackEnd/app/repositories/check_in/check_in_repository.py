from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.integrations.supabase.client import get_supabase_admin_client


CLINIC_TIMEZONE = ZoneInfo("America/Argentina/Buenos_Aires")


def turn_select_columns() -> str:
    return "id,fecha,hora_inicio,hora_fin,estado,paciente_id,profesional_id"


def get_today_date() -> str:
    return datetime.now(CLINIC_TIMEZONE).date().isoformat()


def list_reserved_turns_for_today(patient_id: str) -> list[dict]:
    today = get_today_date()

    response = (
        get_supabase_admin_client()
        .table("turnos")
        .select(turn_select_columns())
        .eq("paciente_id", patient_id)
        .eq("fecha", today)
        .eq("estado", "reservado")
        .order("hora_inicio")
        .limit(1)
        .execute()
    )

    return response.data or []


def get_present_turn_for_today(patient_id: str) -> dict | None:
    today = get_today_date()

    response = (
        get_supabase_admin_client()
        .table("turnos")
        .select(turn_select_columns())
        .eq("paciente_id", patient_id)
        .eq("fecha", today)
        .eq("estado", "presente")
        .order("hora_inicio")
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]


def mark_turn_as_present(turn_id: str) -> dict | None:
    now = datetime.now(timezone.utc).isoformat()

    response = (
        get_supabase_admin_client()
        .table("turnos")
        .update(
            {
                "estado": "presente",
                "actualizado_en": now,
            }
        )
        .eq("id", turn_id)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]
