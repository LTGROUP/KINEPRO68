"""Regenera la grilla de julio, agosto y noviembre 2026 para reasignar
profesional_id ahora que los horarios de los profesionales cubren el día
completo (ver diagnostico_profesionales.py).

Lee la configuración actual (última generada) de cada mes desde
configuracion_grilla en vez de inventar parámetros, y llama directamente a
generar_grilla (sin pasar por HTTP), igual que hacen los demás scripts en
BackEnd/scripts/. Solo borra turnos DISPONIBLES (ver
eliminar_turnos_disponibles_del_mes); los RESERVADOS no se tocan.
"""
import asyncio
from uuid import UUID

from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.integrations.supabase.client import get_supabase_admin_client
from app.schemas.shifts.turno import FranjaHoraria, GenerarGrillaRequest
from app.services.shifts.grilla_service import generar_grilla

MESES_A_REGENERAR = [(7, 2026), (8, 2026), (11, 2026)]


async def obtener_config_actual(session, mes: int, anio: int) -> dict | None:
    result = await session.execute(
        text(
            """
            SELECT hora_inicio, hora_fin, turnos_por_slot, dias_habiles
            FROM configuracion_grilla
            WHERE mes = :mes AND anio = :anio
            ORDER BY creado_en DESC
            LIMIT 1
            """
        ),
        {"mes": mes, "anio": anio},
    )
    row = result.fetchone()
    if not row:
        return None
    return {
        "hora_inicio": row.hora_inicio,
        "hora_fin": row.hora_fin,
        "turnos_por_slot": row.turnos_por_slot,
        "dias_habiles": row.dias_habiles.split(","),
    }


def obtener_creado_por() -> UUID:
    supabase = get_supabase_admin_client()
    result = (
        supabase.table("profiles")
        .select("id")
        .in_("rol", ["administrativo", "secretaria"])
        .limit(1)
        .execute()
    )
    if not result.data:
        raise RuntimeError("No hay ningún profile con rol administrativo/secretaria para usar como creado_por")
    return UUID(result.data[0]["id"])


async def main():
    creado_por = obtener_creado_por()
    print(f"Usando creado_por = {creado_por}")

    async with AsyncSessionLocal() as session:
        for mes, anio in MESES_A_REGENERAR:
            config = await obtener_config_actual(session, mes, anio)
            if not config:
                print(f"[{mes}/{anio}] No se encontró configuración en configuracion_grilla — se omite")
                continue

            request = GenerarGrillaRequest(
                mes=mes,
                anio=anio,
                franjas=[FranjaHoraria(hora_inicio=config["hora_inicio"], hora_fin=config["hora_fin"])],
                turnos_por_slot=config["turnos_por_slot"],
                dias_habiles=config["dias_habiles"],
            )

            print(
                f"[{mes}/{anio}] Regenerando con hora_inicio={config['hora_inicio']} "
                f"hora_fin={config['hora_fin']} turnos_por_slot={config['turnos_por_slot']} "
                f"dias_habiles={config['dias_habiles']}"
            )

            try:
                respuesta = await generar_grilla(session, request, creado_por)
                print(f"[{mes}/{anio}] {respuesta.mensaje}")
            except ValueError as e:
                print(f"[{mes}/{anio}] Omitido: {e}")

    print("\n=== Diagnóstico posterior ===")
    async with AsyncSessionLocal() as session:
        r = await session.execute(
            text("SELECT COUNT(*) FROM turnos WHERE profesional_id IS NULL AND estado != 'cancelado'")
        )
        print(f"Turnos sin profesional_id (no cancelados): {r.scalar()}")


if __name__ == "__main__":
    asyncio.run(main())
