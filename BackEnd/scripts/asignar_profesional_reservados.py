"""Corrección puntual: asigna profesional_id a turnos RESERVADO que nacieron
sin profesional (generados antes de ampliar los horarios de los profesionales,
ver seed_profesionales / diagnostico_profesionales).

solicitar_turno y registrar_turno_manual_secretaria (turnos_service.py) solo
setean estado/paciente_id/area_tratamiento al reservar — nunca tocan
profesional_id, porque se asume que ya viene asignado desde la grilla. Los 29
turnos de julio/agosto/noviembre 2026 quedaron con profesional_id NULL porque
se reservaron antes del fix de horarios.

Este script SOLO actualiza profesional_id. No toca paciente_id ni estado.
Reutiliza _elegir_profesional (misma lógica que usa generar_grilla) para
elegir, entre los profesionales disponibles en ese horario, el de menor carga
ese día.
"""
import asyncio
from datetime import date

from sqlalchemy import select, update

from app.db.session import AsyncSessionLocal
from app.models.turno import Turno, EstadoTurno
from app.repositories.shifts.grilla import (
    obtener_todos_professional_profiles,
    obtener_conteo_turnos_por_profesional_mes,
)
from app.services.shifts.grilla_service import _elegir_profesional

MESES_AFECTADOS = [(6, 2026), (7, 2026), (8, 2026), (11, 2026)]


async def main():
    profesionales = obtener_todos_professional_profiles()

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Turno).where(
                Turno.profesional_id.is_(None),
                Turno.estado == EstadoTurno.RESERVADO,
            )
        )
        turnos = [
            t for t in result.scalars().all()
            if (t.fecha.month, t.fecha.year) in MESES_AFECTADOS
        ]

        print(f"Turnos reservados sin profesional a corregir: {len(turnos)}")

        import calendar
        conteo = {}
        for mes, anio in MESES_AFECTADOS:
            primer_dia = date(anio, mes, 1)
            ultimo_dia = date(anio, mes, calendar.monthrange(anio, mes)[1])
            parcial = await obtener_conteo_turnos_por_profesional_mes(session, primer_dia, ultimo_dia)
            conteo.update(parcial)

        from collections import defaultdict
        conteo_dd = defaultdict(int, conteo)

        sin_disponible = []
        actualizados = 0

        for turno in turnos:
            prof_id = _elegir_profesional(
                profesionales, turno.hora_inicio, turno.hora_fin, conteo_dd, turno.fecha
            )
            if prof_id is None:
                sin_disponible.append(turno.id)
                print(f"  [SIN PROFESIONAL DISPONIBLE] turno {turno.id} {turno.fecha} {turno.hora_inicio}-{turno.hora_fin}")
                continue

            await session.execute(
                update(Turno).where(Turno.id == turno.id).values(profesional_id=prof_id)
            )
            actualizados += 1
            print(f"  turno {turno.id} {turno.fecha} {turno.hora_inicio}-{turno.hora_fin} -> profesional {prof_id}")

        await session.commit()

        print(f"\nActualizados: {actualizados}")
        print(f"Sin profesional disponible (requieren revisión manual): {len(sin_disponible)}")

    print("\n=== Diagnóstico posterior ===")
    async with AsyncSessionLocal() as session:
        from sqlalchemy import text
        r = await session.execute(
            text("SELECT COUNT(*) FROM turnos WHERE profesional_id IS NULL AND estado != 'cancelado'")
        )
        print(f"Turnos sin profesional_id (no cancelados, todos los meses): {r.scalar()}")


if __name__ == "__main__":
    asyncio.run(main())
