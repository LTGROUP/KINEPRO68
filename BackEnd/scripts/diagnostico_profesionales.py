"""Diagnóstico de asignación de profesional_id en turnos.

Solo lectura: no modifica datos. Ver Docs/CONTEXTO_TECNICO.md para contexto
de por qué profesional_id no tiene FK real y de la lógica de _elegir_profesional
en app/services/shifts/grilla_service.py.
"""
import asyncio

from app.integrations.supabase.client import get_supabase_admin_client
from app.db.session import AsyncSessionLocal
from sqlalchemy import text


async def main():
    supabase = get_supabase_admin_client()

    result = supabase.table("profiles").select("id,nombre,apellido,dni,activo").eq("rol", "profesional").execute()
    print("=== PROFILES con rol=profesional ===")
    for p in result.data:
        print(p)
    print(f"Total: {len(result.data)}")

    result2 = supabase.table("professional_profiles").select("*").execute()
    print("\n=== PROFESSIONAL_PROFILES ===")
    for pp in result2.data:
        print(pp)
    print(f"Total: {len(result2.data)}")

    async with AsyncSessionLocal() as session:
        r = await session.execute(
            text("SELECT COUNT(*) FROM turnos WHERE profesional_id IS NULL AND estado != 'cancelado'")
        )
        print(f"\n=== Turnos sin profesional_id (no cancelados): {r.scalar()} ===")

        r2 = await session.execute(
            text(
                """
                SELECT fecha, COUNT(*) as total,
                       SUM(CASE WHEN profesional_id IS NULL THEN 1 ELSE 0 END) as sin_profesional
                FROM turnos
                WHERE estado NOT IN ('cancelado')
                GROUP BY fecha
                ORDER BY fecha DESC
                LIMIT 20
                """
            )
        )
        print("\n=== Últimas 20 fechas — total turnos vs sin profesional ===")
        for row in r2:
            print(row)

        r3 = await session.execute(text("SELECT COUNT(*) FROM turnos"))
        print(f"\n=== Total turnos en la tabla: {r3.scalar()} ===")


if __name__ == "__main__":
    asyncio.run(main())
