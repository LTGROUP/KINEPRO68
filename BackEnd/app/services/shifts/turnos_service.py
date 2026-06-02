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
    PacienteEnEsperaResponse,
    InscripcionListaEsperaResponse
)

from app.repositories.shifts.turnos import (
    obtener_turnos_disponibles_por_fecha,
    obtener_turno_existente_del_paciente,
    actualizar_estado_turno,
    obtener_turno_por_id_con_lock,  
    obtener_turnos_del_paciente,    
    obtener_lista_espera_por_turno,
    crear_inscripcion_lista_espera,
    obtener_inscripcion_lista_espera,
    obtener_turnos_para_paciente_por_fecha
)

from app.repositories.shifts.turnos import obtener_agenda_diaria_pura
from app.schemas.shifts.turno import AgendaDiariaResponse, AgendaTurnoResponse, PacienteAgendaInfo
from app.services.patients.patient_service import get_patient_detail

async def consultar_turnos_disponibles(db: AsyncSession, fecha_buscada: date):

    # Validar fecha
    if not fecha_buscada:
        raise ValueError("Fecha inválida")

    # Validar 48 horas de anticipación
    fechayhora_ahora = datetime.utcnow()
    fechayhora_minima = fechayhora_ahora + timedelta(hours=48)

    # Esto va a depender de si deja seleccionar o no una fecha invalida
    inicio_fecha_buscada = datetime.combine(fecha_buscada, datetime.min.time())

    #if inicio_fecha_buscada < fechayhora_minima:
    #    return {"mensaje": "No se puede agendar turnos con menos de 48 horas"}

    # Llamar al repository CON AWAIT
    turnos = await obtener_turnos_disponibles_por_fecha(db, fecha_buscada)

    # Si no se encontraron turnos
    if not turnos:
        return {"mensaje": f"No existen turnos disponible para la fecha seleccionada: {fecha_buscada}."}

    # Si se encontraron se devuelven
    return turnos

async def consultar_turnos_para_paciente(
    db: AsyncSession,
    fecha_buscada: date,
):

    if not fecha_buscada:
        raise ValueError("Fecha inválida")

    fechayhora_ahora = datetime.utcnow()
    fechayhora_minima = fechayhora_ahora + timedelta(hours=48)

    inicio_fecha_buscada = datetime.combine(
        fecha_buscada,
        datetime.min.time()
    )

    if inicio_fecha_buscada < fechayhora_minima:
        raise ValueError(
            "No se puede solicitar turnos con menos de 48 horas de anticipación"
        )

    turnos = await obtener_turnos_para_paciente_por_fecha(
        db,
        fecha_buscada,
    )

    if not turnos:
        return {
            "mensaje": f"No existen turnos para la fecha {fecha_buscada}"
        }

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

async def inscribirse_lista_espera(
    db: AsyncSession,
    turno_id: UUID,
    paciente_id: UUID,
    area_tratamiento: AreaTratamiento,   
):

    # Se busca el turno por id
    turno = await obtener_turno_por_id_con_lock(db, turno_id)
    if not turno:
        raise ValueError("El turno indicado no existe")

    # Validar que el turno no esté disponible
    if turno.estado == EstadoTurno.DISPONIBLE:  # type: ignore
        raise ValueError("El turno seleccionado posee disponibilidad")

    # Verificar que el paciente no esté ya anotado
    existente = await obtener_inscripcion_lista_espera(
        db, turno_id, paciente_id
    )
    if existente:
        raise ValueError("Ya te encuentras registrado en la lista de espera de este turno")

    # Crear inscripción
    inscripcion = await crear_inscripcion_lista_espera(
        db,
        turno_id,
        paciente_id,
        area_tratamiento   # ← PASAR EL ÁREA
    )

    return InscripcionListaEsperaResponse(
        mensaje="Fuiste agregado a la lista de espera. Te notificaremos si se libera un cupo",
        turno_id=turno_id,
    )

# Cancela un turno
async def cancelar_turno(db: AsyncSession, turno_id: UUID, paciente_id: UUID):
    async with db.begin():
        turno = await obtener_turno_por_id_con_lock(db, turno_id)

        if not turno:
            raise HTTPException(status_code=404, detail="El turno no existe.")

        if turno.estado != EstadoTurno.RESERVADO: # type: ignore
            raise HTTPException(status_code=400, detail=f"No se puede cancelar un turno con estado: {turno.estado}")

        # ← VALIDACIÓN NUEVA: solo el dueño puede cancelar
        if turno.paciente_id != paciente_id: # type: ignore
            raise HTTPException(status_code=403, detail="No tenés permiso para cancelar este turno.")

        fecha_hora_turno = datetime.combine(turno.fecha, turno.hora_inicio) # type: ignore
        ahora = datetime.utcnow()
        mensaje_advertencia = None

        if (fecha_hora_turno - ahora) < timedelta(hours=48):
            mensaje_advertencia = "Al cancelar con menos de 48 horas de anticipación, no podrá reasignar este turno."

        turno_actualizado = await actualizar_estado_turno(db=db, turno=turno, nuevo_estado=EstadoTurno.CANCELADO)

    return {"turno": turno_actualizado, "mensaje": mensaje_advertencia}

async def consultar_agenda_diaria(db: AsyncSession, fecha_buscada: date, actor_role: str):
    # Buscamos todos los turnos del día
    turnos_db = await obtener_agenda_diaria_pura(db, fecha_buscada)
    
    turnos_formateados = []

    for turno in turnos_db:
        paciente_info = None
        print(f"Turno={turno.id} paciente_id={turno.paciente_id}")
        # Si el turno tiene un paciente, vamos a buscar sus datos
        if turno.paciente_id:
            try:
                # Usamos el servicio de pacientes para no romper el encapsulamiento
                paciente_detalle = get_patient_detail(str(turno.paciente_id), actor_role)
                print("PACIENTE ENCONTRADO:", paciente_detalle)

                # Armamos el mini-diccionario con los datos del paciente
                paciente_info = PacienteAgendaInfo(
                    id=turno.paciente_id,
                    nombre=paciente_detalle.nombre,
                    apellido=paciente_detalle.apellido,
                    dni=paciente_detalle.dni
                )
                
            # Si el paciente fue borrado o hay un error, mandamos mensaje para comprobar que entro al except
            except Exception as e:
                print("ERROR PACIENTE:", e)
        
        # Formateamos el turno final
        turno_formateado = AgendaTurnoResponse(
            id=turno.id,
            hora_inicio=turno.hora_inicio,
            hora_fin=turno.hora_fin,
            estado=turno.estado,
            area_tratamiento=turno.area_tratamiento,
            paciente=paciente_info
        )
        turnos_formateados.append(turno_formateado)
        
    return AgendaDiariaResponse(
        fecha=fecha_buscada,
        turnos=turnos_formateados,
        total=len(turnos_formateados)
    )

async def marcar_asistencia_turno(db: AsyncSession, turno_id: UUID, nuevo_estado: str):
    async with db.begin():
        turno = await obtener_turno_por_id_con_lock(db, turno_id)
        
        if not turno:
            raise ValueError("El turno no existe")
            
        if turno.estado != EstadoTurno.RESERVADO:
            raise ValueError(f"No se puede dar presente a un turno con estado {turno.estado}")
            
        # SOLUCIÓN: Cambiamos el estado directamente y dejamos que db.begin() haga el commit solo
        turno.estado = nuevo_estado
        db.add(turno)
        
    return turno