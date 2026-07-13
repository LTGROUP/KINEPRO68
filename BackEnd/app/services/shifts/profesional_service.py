from datetime import date
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.patients.patient_repository import get_patient_by_id
from app.repositories.shifts.turnos import obtener_turnos_por_profesional_y_fecha
from app.schemas.shifts.turno import (
    AgendaProfesionalResponse,
    AgendaProfesionalTurnoResponse,
    PacienteAgendaInfo,
)


async def consultar_agenda_profesional(
    db: AsyncSession,
    profesional_id: UUID,
    fecha: date,
) -> AgendaProfesionalResponse:
    turnos_db = await obtener_turnos_por_profesional_y_fecha(db, profesional_id, fecha)
    turnos_formateados = []

    for turno in turnos_db:
        paciente_info = None
        if turno.paciente_id:
            try:
                paciente_data = get_patient_by_id(str(turno.paciente_id))
                if paciente_data:
                    paciente_info = PacienteAgendaInfo(
                        id=turno.paciente_id,
                        nombre=paciente_data["nombre"],
                        apellido=paciente_data["apellido"],
                        dni=paciente_data["dni"],
                    )
            except Exception:
                pass

        turnos_formateados.append(
            AgendaProfesionalTurnoResponse(
                id=turno.id,
                fecha=turno.fecha,
                hora_inicio=turno.hora_inicio,
                hora_fin=turno.hora_fin,
                area_tratamiento=turno.area_tratamiento,
                estado=turno.estado,
                paciente_id=turno.paciente_id,
                paciente=paciente_info,
            )
        )

    return AgendaProfesionalResponse(
        fecha=fecha,
        turnos=turnos_formateados,
        total=len(turnos_formateados),
    )
