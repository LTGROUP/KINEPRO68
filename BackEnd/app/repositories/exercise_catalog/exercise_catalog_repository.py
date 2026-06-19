from app.integrations.supabase.client import get_supabase_admin_client


def list_catalog_exercises(
    search: str = "",
    area: str = "",
    zone: str = "",
    limit: int = 500,
) -> list[dict]:
    query = (
        get_supabase_admin_client()
        .table("ejercicios_catalogo")
        .select("id,nombre,area_tratamiento,zona_muscular,activo")
        .eq("activo", True)
    )

    if search:
        query = query.ilike("nombre", f"%{search}%")

    if area:
        query = query.eq("area_tratamiento", area)

    if zone:
        query = query.eq("zona_muscular", zone)

    response = query.order("nombre").limit(limit).execute()
    return response.data


def get_catalog_exercises_by_ids(exercise_ids: list[str]) -> list[dict]:
    if not exercise_ids:
        return []

    response = (
        get_supabase_admin_client()
        .table("ejercicios_catalogo")
        .select("id,nombre,area_tratamiento,zona_muscular,activo")
        .in_("id", exercise_ids)
        .execute()
    )
    return response.data
