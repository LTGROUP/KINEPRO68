from datetime import date, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional

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

from uuid import UUID

async def solicitar_turno(
        db: AsyncSession,
        request: SolicitarTurnoRequest,
        paciente_id: UUID,
) -> TurnoSolicitadoResponse: 
    async with db.begin():
        turno = await obtener_turno_por_id_con_lock(db, request.turno_id)

        if not turno:
                raise ValueError("El turno no existe")

        # Escenario 3 --> validacion de 48hs
        fechayhora_ahora = datetime.utcnow()
        fechayhora_turno = datetime.combine(turno.fecha, turno.hora_inicio)
        if fechayhora_turno - fechayhora_ahora < timedelta(hours=48):
            raise ValueError("No es posible solicitar un turno con menos de 48hs de anticipación")

        # Escenario 2 --> Validacion turno duplicado
        turno_existe = await obtener_turno_existente_del_paciente(
             db, paciente_id, turno.fecha, turno.hora_inicio
        )

        if turno_existe:
             raise ValueError("Ya posee un turno registrado para ese horario")

        # Validacion de que siga disponible
        if turno.estado != EstadoTurno.DISPONIBLE:
             raise ValueError("El turno ya no esta disponible")

        # Escenario 1 --> reservar el turno
        turno.estado = EstadoTurno.RESERVADO
        
        # FIX 1: Forzar que el UUID sea un objeto UUID nativo para que Postgres/Supabase no lo rechace
        if isinstance(paciente_id, str):
            paciente_id = UUID(paciente_id)
            
        turno.paciente_id = paciente_id
        turno.area_tratamiento = request.area_tratamiento
        
        # FIX 2: ¡El guardado explícito que faltaba!
        db.add(turno)

    # Fuera del bloque de la base de datos armamos la respuesta
    mes_nombre = turno.fecha.strftime("%d/%m/%Y")
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

        # Validacion por si existe, no deberia pasar!
        if not turno:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="El turno solicitado no existe."
            )

        # Validacion por si no esta reservado, no deberia pasar!
        if turno.estado != EstadoTurno.RESERVADO: # type: ignore
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede cancelar un turno con estado: {turno.estado}"
            )

        # Comprobar si el turno es antes de las 48 horas
        fecha_hora_turno = datetime.combine(turno.fecha, turno.hora_inicio) # type: ignore
        ahora = datetime.utcnow() # Usamos la hora actual del servidor

        mensaje_advertencia = None

        if (fecha_hora_turno - ahora) < timedelta(hours=48):
            mensaje_advertencia = "Al cancelar con menos de 48 horas de anticipación, no podrá reasignar este turno."

        # SOLUCIÓN: Cambiamos el estado directamente acá para no chocar transacciones
        turno.estado = EstadoTurno.CANCELADO
        db.add(turno)
        turno_actualizado = turno
    
    # 5. Devolvemos el turno modificado junto con el mensaje (si corresponde)
    return {
        "turno": turno_actualizado,
        "mensaje": mensaje_advertencia
    }

async def consultar_agenda_diaria(db: AsyncSession, fecha_buscada: date, actor_role: str, area: Optional[str] = None):
    # Le pasamos el área al repositorio
    turnos_db = await obtener_agenda_diaria_pura(db, fecha_buscada, area)
    
    turnos_formateados = []
    
    for turno in turnos_db:
        paciente_info = None
        
        # 2. Si el turno tiene un paciente, vamos a buscar sus datos
        if turno.paciente_id:
            try:
                # Usamos el servicio de pacientes para no romper el encapsulamiento
                paciente_detalle = await get_patient_detail(str(turno.paciente_id), actor_role)
                
                # 3. Armamos el mini-diccionario con los datos del paciente
                paciente_info = PacienteAgendaInfo(
                    id=turno.paciente_id,
                    nombre=paciente_detalle.nombre,
                    apellido=paciente_detalle.apellido,
                    dni=paciente_detalle.dni
                )
            except Exception:
                # Si el paciente fue borrado o hay un error, lo dejamos vacío para que la agenda no explote
                pass
        
        # 4. Formateamos el turno final
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

async def reprogramar_turno(
    db: AsyncSession, 
    turno_viejo_id: UUID, 
    nuevo_turno_id: UUID, 
    paciente_id: UUID, 
    nueva_area: str
):
    async with db.begin():
        # Traemos ambos turnos
        turno_viejo = await obtener_turno_por_id_con_lock(db, turno_viejo_id)
        turno_nuevo = await obtener_turno_por_id_con_lock(db, nuevo_turno_id)

        if not turno_viejo or not turno_nuevo:
            raise ValueError("El turno especificado no existe.")

        if turno_viejo.paciente_id != paciente_id:
            raise ValueError("El turno a reasignar no te pertenece.")

        ahora = datetime.utcnow()

        # REGLA 1 (Escenario 2): Más de 48hs para el turno original
        fecha_hora_viejo = datetime.combine(turno_viejo.fecha, turno_viejo.hora_inicio)
        if (fecha_hora_viejo - ahora) < timedelta(hours=48):
            raise ValueError("No es posible reasignar un turno con menos de 48 horas de anticipación")

        # REGLA 3 (Extra): Más de 48hs para el turno nuevo
        fecha_hora_nuevo = datetime.combine(turno_nuevo.fecha, turno_nuevo.hora_inicio)
        if (fecha_hora_nuevo - ahora) < timedelta(hours=48):
            raise ValueError("No se puede reasignar a un horario con menos de 48 hs desde la fecha actual.")

        # REGLA 2 (Escenario 3): Disponibilidad del nuevo turno
        if turno_nuevo.estado != EstadoTurno.DISPONIBLE:
            raise ValueError("No hay disponibilidad para el horario seleccionado")

        # EJECUCIÓN: Liberamos el turno original
        turno_viejo.estado = EstadoTurno.DISPONIBLE
        turno_viejo.paciente_id = None
        turno_viejo.area_tratamiento = None

        # EJECUCIÓN: Ocupamos el turno nuevo
        turno_nuevo.estado = EstadoTurno.RESERVADO
        turno_nuevo.paciente_id = paciente_id
        turno_nuevo.area_tratamiento = nueva_area

        db.add(turno_viejo)
        db.add(turno_nuevo)

    # Armamos el string exacto que pide el Escenario 1
    fecha_str = turno_nuevo.fecha.strftime("%d/%m/%Y")
    hora_str = turno_nuevo.hora_inicio.strftime("%H:%M")
    mensaje_exito = f"Turno reasignado con éxito para el {fecha_str} a las {hora_str} hs"

    return {"mensaje": mensaje_exito, "turno": turno_nuevo}