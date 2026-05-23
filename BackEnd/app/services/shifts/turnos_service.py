from datetime import date, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from fastapi import HTTPException, status
from app.models.turno import EstadoTurno, AreaTratamiento

from app.schemas.shifts.turno import (
    SolicitarTurnoRequest,
    TurnoSolicitadoResponse,
    MisTurnosResponse,
    MiTurnoResponse,
    ListaEsperaResponse,
    PacienteEnEsperaResponse
)

from app.repositories.shifts.turnos import (
    obtener_turnos_disponibles_por_fecha,
    obtener_turno_existente_del_paciente,
    actualizar_estado_turno,
    obtener_turno_por_id_con_lock,  
    obtener_turnos_del_paciente,    
    obtener_lista_espera_por_turno
)

async def consultar_turnos_disponibles(db: AsyncSession, fecha_buscada: date):

    # Validar fecha
    if not fecha_buscada:
        raise ValueError("Fecha inválida")

    # Validar 48 horas de anticipación
    fechayhora_ahora = datetime.utcnow()
    fechayhora_minima = fechayhora_ahora + timedelta(hours=48)

    # Esto va a depender de si deja seleccionar o no una fecha invalida
    inicio_fecha_buscada = datetime.combine(fecha_buscada, datetime.min.time())

    if inicio_fecha_buscada < fechayhora_minima:
        return {"mensaje": "No se puede agendar turnos con menos de 48 horas"}

    # Llamar al repository CON AWAIT
    turnos = await obtener_turnos_disponibles_por_fecha(db, fecha_buscada)

    # Si no se encontraron turnos
    if not turnos:
        return {"mensaje": f"No existen turnos disponible para la fecha seleccionada: {fecha_buscada}."}

    # Si se encontraron se devuelven
    return turnos

async def solicitar_turno(
        db: AsyncSession,
        request: SolicitarTurnoRequest,
        paciente_id: UUID,
) -> TurnoSolicitadoResponse: 
    
    async with db.begin():
        turno = await obtener_turno_por_id_con_lock(db, request.turno_id)

        if not turno:
                raise ValueError("El turno no existe")

        #Escenario 3 --> validacion de 48hs
        fechayhora_ahora = datetime.utcnow()
        fechayhora_turno = datetime.combine(turno.fecha, turno.hora_inicio)
        if fechayhora_turno - fechayhora_ahora < timedelta(hours=48):
            raise ValueError("No es posible solicitar un turno con menos de 48hs de anticipación")

        #Escenario 2 --> Validacion turno duplicado
        turno_existe = await obtener_turno_existente_del_paciente(
             db, paciente_id, turno.fecha, turno.hora_inicio
        )

        if turno_existe:
             raise ValueError("Ya posee un turno registrado para ese horario")

        #Validacion de que siga disponible
        if turno.estado != EstadoTurno.DISPONIBLE:
             raise ValueError("El turno ya no esta disponible")

        #Escenario 1 --> reservar el turno
        turno.estado = EstadoTurno.RESERVADO
        turno.paciente_id = paciente_id
        turno.area_tratamiento = request.area_tratamiento
    mes_nombre= turno.fecha.strftime("%d/%m/%Y")
    hora_str = turno.hora_inicio.strftime("%H:%M")

    return TurnoSolicitadoResponse(
         mensaje=f"Turno solicitado con exito para el {mes_nombre} a las {hora_str} hs",
         turno_id=turno.id,
         fecha=turno.fecha,
         hora_inicio=turno.hora_inicio,  
         hora_fin=turno.hora_fin,
         area_tratamiento=turno.area_tratamiento,

    )

async def ver_mis_turnos(
    db: AsyncSession,
    paciente_id: UUID,
) -> MisTurnosResponse:

    turnos = await obtener_turnos_del_paciente(db, paciente_id)

    #Escenario 2
    if not turnos:
         return MisTurnosResponse(
              turnos=[],
              total=0,
              mensaje="No posee turnos registrados actualmente"
         )
    #Escneario 1
    return MisTurnosResponse(
         turnos=[MiTurnoResponse.model_validate(t) for t in turnos],
         total=len(turnos),
    )
async def consultar_lista_espera(
    db: AsyncSession,
    turno_id: UUID,
) -> ListaEsperaResponse:

    lista = await obtener_lista_espera_por_turno(db, turno_id)

    # Escenario 2: sin pacientes
    if not lista:
        return ListaEsperaResponse(
            turno_id=turno_id,
            pacientes=[],
            total=0,
            mensaje="No hay pacientes en lista de espera para este turno"
        )

    # Escenario 1: con pacientes — asignar posición
    pacientes = [
        PacienteEnEsperaResponse(
            id=p.id,
            paciente_id=p.paciente_id,
            fecha_inscripcion=p.fecha_inscripcion,
            posicion=i + 1,
        )
        for i, p in enumerate(lista)
    ]

    return ListaEsperaResponse(
        turno_id=turno_id,
        pacientes=pacientes,
        total=len(pacientes),
    )
# Cancela un turno
async def cancelar_turno(db: AsyncSession, turno_id: UUID):
    async with db.begin():
        turno = await obtener_turno_por_id_con_lock(db, turno_id)

        # Validacion por si existe,no deberia pasar!
        if not turno:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="El turno solicitado no existe."
            )

        # Validacion por si no esta reservado,no deberia pasar!
        if turno.estado != EstadoTurno.RESERVADO: # type: ignore
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede cancelar un turno con estado: {turno.estado}"
            )

        #Comprobar si el turno es antes de las 48 horas
        fecha_hora_turno = datetime.combine(turno.fecha, turno.hora_inicio) # type: ignore
        ahora = datetime.utcnow() # Usamos la hora actual del servidor

        mensaje_advertencia = None

        if (fecha_hora_turno - ahora) < timedelta(hours=48):
            mensaje_advertencia = "Al cancelar con menos de 48 horas de anticipación, no podrá reasignar este turno."

        #Se busca el turno y se le cambia el estado
        turno_actualizado = await actualizar_estado_turno(
            db=db, 
            turno=turno, 
            nuevo_estado=EstadoTurno.CANCELADO
        )
    
    # 5. Devolvemos el turno modificado junto con el mensaje (si corresponde)
    return {
        "turno": turno_actualizado,
        "mensaje": mensaje_advertencia
    }
