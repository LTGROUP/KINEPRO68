import logging
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta # restar meses exactos
from zoneinfo import ZoneInfo
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from uuid import UUID
from typing import Optional, List
from collections import defaultdict

from fastapi import HTTPException, status
from jose import jwt, JWTError
from app.config import settings
from app.models.turno import EstadoTurno, AreaTratamiento, ListaEspera as ListaEsperaModel

logger = logging.getLogger(__name__)

from app.schemas.shifts.turno import (
    SolicitarTurnoRequest,
    TurnoSolicitadoResponse,
    MisTurnosResponse,
    MiTurnoResponse,
    ListaEsperaResponse,
    PacienteEnEsperaResponse,
    InscripcionListaEsperaResponse,
    CancelarTurnoSecretariaResponse,
    AusentismoResponse,
    ReporteAusentismoResponse,
    TurnoInfoTokenResponse,
)

from app.repositories.shifts.turnos import (
    obtener_turnos_disponibles_por_fecha,
    obtener_turno_existente_del_paciente,
    actualizar_estado_turno,
    obtener_turno_por_id_con_lock,
    obtener_turno_por_id_simple,
    obtener_turnos_del_paciente,
    obtener_lista_espera_por_turno,
    crear_inscripcion_lista_espera,
    obtener_inscripcion_lista_espera,
    obtener_inscripcion_por_id,
    obtener_turnos_para_paciente_por_fecha,
    obtener_todos_turnos_por_fecha,
    verificar_paciente_en_lista,
    obtener_metricas_cancelaciones,
    obtener_cancelaciones_por_mes,
    obtener_primer_paciente_en_espera,
    obtener_ausencias_por_rango,
    obtener_rango_anios,
    obtener_inscripciones_lista_espera_por_paciente,
    ListaEspera
)

from app.repositories.shifts.grilla import obtener_configuracion_por_mes


ARGENTINA_TZ = ZoneInfo("America/Argentina/Buenos_Aires")

from app.repositories.shifts.turnos import obtener_agenda_diaria_pura
from app.schemas.shifts.turno import AgendaDiariaResponse, AgendaTurnoResponse, PacienteAgendaInfo
from app.services.patients.patient_service import get_patient_detail

async def consultar_turnos_disponibles(db: AsyncSession, fecha_buscada: date):

    # Validar fecha
    if not fecha_buscada:
        raise ValueError("Fecha inválida")

    # Validar 48 horas de anticipación
    fechayhora_ahora = datetime.now(ARGENTINA_TZ).replace(tzinfo=None)
    fechayhora_minima = fechayhora_ahora + timedelta(hours=48)

    # Esto va a depender de si deja seleccionar o no una fecha invalida
    inicio_fecha_buscada = datetime.combine(fecha_buscada, datetime.min.time())

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

    fechayhora_ahora = datetime.now(ARGENTINA_TZ).replace(tzinfo=None)
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
            "mensaje": f"No existen turnos para la fecha {fecha_buscada.strftime('%Y/%m/%d')}"
        }

    return turnos


async def _enviar_confirmacion_turno_email(db: AsyncSession, paciente_id: UUID, turno) -> None:
    """Despacha el envío del email de confirmación sin bloquear al llamador.

    Se intenta encolar como tarea Celery; si Celery/Redis no está disponible
    (por ejemplo en desarrollo local), se ejecuta en segundo plano dentro del
    mismo proceso vía asyncio.create_task, sin esperar el resultado.
    """
    import asyncio
    from sqlalchemy import text as sa_text
    from app.tasks.recordatorios import enviar_confirmacion_turno_task, _enviar_confirmacion
    from app.repositories.patients.patient_repository import get_patient_by_id

    patient = get_patient_by_id(str(paciente_id))
    email_paciente = patient.get("email") if patient else None
    nombre_paciente = (
        f"{patient.get('nombre', '')} {patient.get('apellido', '')}".strip()
        if patient else ""
    )

    if not email_paciente:
        logger.warning(
            "Confirmación de turno: paciente %s sin email en profiles; intentando auth.users",
            paciente_id,
        )
    try:
        if not email_paciente:
            res_email = await db.execute(
                sa_text("SELECT email FROM auth.users WHERE id = :pid"),
                {"pid": str(paciente_id)},
            )
            row = res_email.fetchone()
            email_paciente = row[0] if row else None
    except Exception:
        logger.exception("No se pudo obtener el email del paciente %s", paciente_id)

    if not email_paciente:
        logger.warning("Confirmación de turno no enviada: sin email para paciente %s", paciente_id)
        return

    area_str = turno.area_tratamiento.value if turno.area_tratamiento else None
    fecha_str = turno.fecha.isoformat()
    hora_inicio_str = turno.hora_inicio.strftime("%H:%M")
    hora_fin_str = turno.hora_fin.strftime("%H:%M")

    try:
        enviar_confirmacion_turno_task.delay(
            email_paciente, nombre_paciente, fecha_str, hora_inicio_str, hora_fin_str, area_str,
        )
    except Exception:
        logger.warning(
            "Confirmación de turno: Celery/Redis no disponible, enviando en segundo plano en el mismo proceso (paciente %s)",
            paciente_id,
        )
        asyncio.create_task(
            _enviar_confirmacion(email_paciente, nombre_paciente, fecha_str, hora_inicio_str, hora_fin_str, area_str)
        )


async def _enviar_confirmacion_reprogramacion_email(
    db: AsyncSession, paciente_id: UUID, turno_viejo, area_vieja, turno_nuevo,
) -> None:
    from sqlalchemy import text as sa_text
    from app.integrations.email.email_service import send_confirmacion_reprogramacion
    from app.repositories.patients.patient_repository import get_patient_by_id

    patient = get_patient_by_id(str(paciente_id))
    email_paciente = patient.get("email") if patient else None

    if not email_paciente:
        logger.warning(
            "Confirmación de reprogramación: paciente %s sin email en profiles; intentando auth.users",
            paciente_id,
        )
    try:
        if not email_paciente:
            res_email = await db.execute(
                sa_text("SELECT email FROM auth.users WHERE id = :pid"),
                {"pid": str(paciente_id)},
            )
            row = res_email.fetchone()
            email_paciente = row[0] if row else None
    except Exception:
        logger.exception("No se pudo obtener el email del paciente %s", paciente_id)

    if not email_paciente:
        logger.warning("Confirmación de reprogramación no enviada: sin email para paciente %s", paciente_id)
        return

    enviado = send_confirmacion_reprogramacion(
        email=email_paciente,
        fecha_vieja=turno_viejo.fecha,
        hora_inicio_vieja=turno_viejo.hora_inicio,
        hora_fin_vieja=turno_viejo.hora_fin,
        area_vieja=area_vieja,
        fecha_nueva=turno_nuevo.fecha,
        hora_inicio_nueva=turno_nuevo.hora_inicio,
        hora_fin_nueva=turno_nuevo.hora_fin,
        area_nueva=turno_nuevo.area_tratamiento,
    )
    if enviado:
        logger.info("Confirmación de reprogramación enviada a %s", email_paciente)


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
        fechayhora_ahora = datetime.now(ARGENTINA_TZ).replace(tzinfo=None)
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

    await _enviar_confirmacion_turno_email(db, paciente_id, turno)

    return TurnoSolicitadoResponse(
         mensaje="El turno fue reservado correctamente",
         turno_id=turno.id,
         fecha=turno.fecha,
         hora_inicio=turno.hora_inicio,  
         hora_fin=turno.hora_fin,
         area_tratamiento=turno.area_tratamiento,
    )

# HU: Registro manual de turno por la secretaria a nombre de un paciente
async def registrar_turno_manual_secretaria(
        db: AsyncSession,
        turno_id: UUID,
        paciente_id: UUID,
        area_tratamiento: AreaTratamiento,
        secretaria_id: UUID,
) -> TurnoSolicitadoResponse:
    async with db.begin():
        turno = await obtener_turno_por_id_con_lock(db, turno_id)

        if not turno:
            raise ValueError("El turno no existe")

        if turno.estado != EstadoTurno.DISPONIBLE:
            raise ValueError("El turno ya no esta disponible")

        turno_existe = await obtener_turno_existente_del_paciente(
            db, paciente_id, turno.fecha, turno.hora_inicio
        )
        if turno_existe:
            raise ValueError("Ya posee un turno registrado para ese horario")

        turno.estado = EstadoTurno.RESERVADO
        turno.paciente_id = paciente_id
        turno.area_tratamiento = area_tratamiento

        db.add(turno)

    await _enviar_confirmacion_turno_email(db, paciente_id, turno)

    return TurnoSolicitadoResponse(
        mensaje="El turno fue reservado correctamente",
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
    actor_role: str = "secretaria",
) -> ListaEsperaResponse:

    lista = await obtener_lista_espera_por_turno(db, turno_id)

    if not lista:
        return ListaEsperaResponse(
            turno_id=turno_id,
            pacientes=[],
            total=0,
            mensaje="No hay pacientes en lista de espera para este turno"
        )

    pacientes = []
    for i, p in enumerate(lista):
        nombre = apellido = dni = None
        try:
            detalle = get_patient_detail(str(p.paciente_id), actor_role)
            nombre = detalle.nombre
            apellido = detalle.apellido
            dni = detalle.dni
        except Exception:
            pass

        pacientes.append(PacienteEnEsperaResponse(
            id=p.id,
            paciente_id=p.paciente_id,
            fecha_inscripcion=p.fecha_inscripcion,
            posicion=i + 1,
            nombre=nombre,
            apellido=apellido,
            dni=dni,
        ))

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
    # Verificar que no se supere el límite de lista de espera
    conteo = await db.scalar(
    select(func.count()).select_from(ListaEsperaModel).where(
            ListaEsperaModel.turno_id == turno_id,
            ListaEsperaModel.activo == True
        )
    )
    if conteo >= 5:
        raise ValueError("La lista de espera para este turno ya está completa (máximo 5 personas)")

    if not turno:
        raise ValueError("El turno indicado no existe")

    # Validar que el turno no esté disponible
    if turno.estado == EstadoTurno.DISPONIBLE:  # type: ignore
        raise ValueError("El turno seleccionado posee disponibilidad")
        
    if turno.estado != EstadoTurno.RESERVADO:
        raise ValueError("No es posible anotarse en lista de espera para este turno")

    # Verificar que el paciente no esté ya anotado
    existente = await verificar_paciente_en_lista(db, turno_id, paciente_id)
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


async def consultar_todos_turnos_fecha(db: AsyncSession, fecha_buscada: date):
    turnos = await obtener_todos_turnos_por_fecha(db, fecha_buscada)
    config = await obtener_configuracion_por_mes(db, fecha_buscada.month, fecha_buscada.year)
    turnos_por_slot = config.turnos_por_slot if config else 1
    return turnos, turnos_por_slot


# Cancela un turno
async def cancelar_turno(db: AsyncSession, turno_id: UUID, paciente_id: UUID):
    # Todas las mutaciones sobre `turno` ocurren dentro de este bloque, que hace
    # exactamente UN commit al salir. No volver a asignar atributos de `turno`
    # después de este punto: cualquier escritura fuera de esta transacción
    # dispararía un UPDATE extra en el próximo flush/commit de la sesión.
    async with db.begin():
        turno = await obtener_turno_por_id_con_lock(db, turno_id)

        # Validacion por si existe, no deberia pasar!
        if not turno:
            raise HTTPException(status_code=404, detail="El turno no existe.")

        # Validacion por si no esta reservado, no deberia pasar!
        if turno.estado != EstadoTurno.RESERVADO: # type: ignore
            raise HTTPException(status_code=400, detail=f"No se puede cancelar un turno con estado: {turno.estado}")

        # VALIDACIÓN: solo el dueño puede cancelar
        if str(turno.paciente_id) != str(paciente_id): # type: ignore
            raise HTTPException(status_code=403, detail="No tenés permiso para cancelar este turno.")

        # Comprobar si el turno es antes de las 48 horas
        fecha_hora_turno = datetime.combine(turno.fecha, turno.hora_inicio) # type: ignore
        ahora = datetime.now(ARGENTINA_TZ).replace(tzinfo=None)
        mensaje_advertencia = None

        if (fecha_hora_turno - ahora) < timedelta(hours=48):
            mensaje_advertencia = "Al cancelar con menos de 48 horas de anticipación, no podrá reasignar este turno."

        # Verificar lista de espera antes de liberar (para decidir si despachar tarea)
        primer_espera = await obtener_primer_paciente_en_espera(db, turno.id)

        turno.paciente_id = None
        turno.area_tratamiento = None

        # NO Siempre liberar el turno — la oferta al primero en lista se gestiona por Celery
        if primer_espera:
            # Se mantiene RESERVADO (sin dueño) para que el turno siga
            # figurando como "ocupado": nadie puede solicitarlo directo,
            # solo anotarse en lista de espera, hasta que el primero
            # de la lista confirme o se agote la lista.
            # (turno.estado ya es RESERVADO: SQLAlchemy no incluye esta
            # columna en el UPDATE porque el valor no cambia)
            turno.estado = EstadoTurno.RESERVADO
        else:
            turno.estado = EstadoTurno.DISPONIBLE

        turno_id_str = str(turno.id)

    # A partir de acá `turno` está commiteado y no se le vuelve a asignar
    # ningún atributo. Único efecto posterior al commit: encolar (o ejecutar
    # inline si no hay Celery/Redis) la oferta a la lista de espera.
    if primer_espera:
        from app.tasks.lista_espera import despachar_oferta_turno
        await despachar_oferta_turno(turno_id_str)
        mensaje_lista_espera = "El cupo fue liberado. Se notificará al primero en lista de espera."
    else:
        mensaje_lista_espera = "El cupo fue liberado y está disponible para nuevos turnos"

    return {
        "turno": turno,
        "mensaje": mensaje_advertencia,
        "mensaje_lista_espera": mensaje_lista_espera,
    }

async def consultar_agenda_diaria(db: AsyncSession, fecha_buscada: date, actor_role: str, area: Optional[str] = None):
    # Le pasamos el área al repositorio
    turnos_db = await obtener_agenda_diaria_pura(db, fecha_buscada, area)
    
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

        # HU-6: solo se puede registrar asistencia en turnos del día actual o pasados
        hoy = datetime.now(ARGENTINA_TZ).date()
        if turno.fecha > hoy:
            raise ValueError("No se puede registrar asistencia de un turno futuro")

        turno.estado = nuevo_estado
        db.add(turno)
        
    return turno

MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
# Grafico de metricas

async def consultar_metricas_cancelaciones(db: AsyncSession, mes: Optional[int] = None, anio: Optional[int] = None, rango: Optional[str] = None):
    
    filas = await obtener_metricas_cancelaciones(db)
    datos = {estado.value if hasattr(estado, 'value') else str(estado): total for estado, total in filas}
    
    total_turnos = sum(datos.values())
    cancelados = datos.get("cancelado", 0)
    reservados = datos.get("reservado", 0)
    presentes = datos.get("presente", 0)

    #Calcular la fecha
    hoy = date.today()

    rango_anios = await obtener_rango_anios(db)
    anio_min = int(rango_anios.anio_min) if rango_anios.anio_min else 2025
    anio_max = int(rango_anios.anio_max) if rango_anios.anio_max else 2025
    
    if mes and anio:
        # Filtrar por mes y año específico
        fecha_desde = date(anio, mes, 1)
        if mes == 12:
            fecha_hasta = date(anio + 1, 1, 1)
        else:
            fecha_hasta = date(anio, mes + 1, 1)
    elif rango == "ultimos_6_meses" or (not mes and not anio):
        # Default: últimos 6 meses
        mes_inicio = hoy.month - 5
        anio_inicio = hoy.year
        if mes_inicio <= 0:
            mes_inicio += 12
            anio_inicio -= 1
        fecha_desde = date(anio_inicio, mes_inicio, 1)
        fecha_hasta = date(hoy.year, hoy.month + 1, 1) if hoy.month < 12 else date(hoy.year + 1, 1, 1)
    else:
        fecha_desde = None
        fecha_hasta = None

    filas_mes = await obtener_cancelaciones_por_mes(db, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)

    # Gráfico por mes
    filas_mes = await obtener_cancelaciones_por_mes(db)
    agrupado = defaultdict(lambda: {"cancelados": 0, "reservados": 0, "presentes": 0})
    
    for mes_n, anio_n, estado, total in filas_mes:
        clave = (int(anio_n), int(mes_n))
        estado_str = estado.value if hasattr(estado, 'value') else str(estado)
        if estado_str == "cancelado":
            agrupado[clave]["cancelados"] = total
        elif estado_str == "reservado":
            agrupado[clave]["reservados"] = total
        elif estado_str == "presente":
            agrupado[clave]["presentes"] = total

    grafico = [
        {
            "mes": f"{MESES[m - 1]} {a}",
            "cancelados": vals["cancelados"],
            "reservados": vals["reservados"],
            "presentes": vals["presentes"],
        }
        for (a, m), vals in sorted(agrupado.items())
    ]

    if total_turnos == 0:
        return {"mensaje": "No hay datos disponibles"}

    return {
        "total_turnos": total_turnos,
        "cancelados": cancelados,
        "reservados": reservados,
        "presentes": presentes,
        "tasa_cancelacion": round((cancelados / total_turnos) * 100, 1),
        "anios_disponibles": list(range(anio_min, anio_max + 1)),
        "grafico_por_mes": grafico,
    }

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

        ahora = datetime.now(ARGENTINA_TZ).replace(tzinfo=None)

        # REGLA 1 (Escenario 2): Más de 48hs para el turno original
        fecha_hora_viejo = datetime.combine(turno_viejo.fecha, turno_viejo.hora_inicio)
        if (fecha_hora_viejo - ahora) < timedelta(hours=48):
            raise ValueError("No es posible reasignar un turno con menos de 48 horas de anticipación")

        # REGLA 3 (Extra): Más de 48hs para el turno nuevo
        fecha_hora_nuevo = datetime.combine(turno_nuevo.fecha, turno_nuevo.hora_inicio)
        if (fecha_hora_nuevo - ahora) < timedelta(hours=48):
            raise ValueError("No se puede reasignar a un horario con menos de 48 hs desde la fecha actual.")

        # REGLA 2 (Escenario 3): Disponibilidad del nuevo turno
        if turno_nuevo.estado == EstadoTurno.DISPONIBLE:
            # Turno directo: liberar el viejo y ocupar el nuevo
            area_vieja = turno_viejo.area_tratamiento

            turno_viejo.estado = EstadoTurno.DISPONIBLE
            turno_viejo.paciente_id = None
            turno_viejo.area_tratamiento = None

            turno_nuevo.estado = EstadoTurno.RESERVADO
            turno_nuevo.paciente_id = paciente_id
            turno_nuevo.area_tratamiento = AreaTratamiento(nueva_area)

            db.add(turno_viejo)
            db.add(turno_nuevo)
            inscripto_en_espera = False

        elif turno_nuevo.estado == EstadoTurno.RESERVADO:
            # Sin cupo directo: inscribir en lista de espera del nuevo turno
            ya_en_lista = await verificar_paciente_en_lista(db, turno_nuevo.id, paciente_id)
            if ya_en_lista:
                raise ValueError("Ya te encontrás en la lista de espera de ese turno")

            inscripcion = ListaEsperaModel(
                turno_id=turno_nuevo.id,
                paciente_id=paciente_id,
                area_tratamiento=AreaTratamiento(nueva_area),
            )
            db.add(inscripcion)

            # Marcar el turno original como reprogramado (conserva paciente_id para historial)
            turno_viejo.estado = EstadoTurno.REPROGRAMADO
            db.add(turno_viejo)
            inscripto_en_espera = True

        else:
            raise ValueError("No hay disponibilidad para el horario seleccionado")

    fecha_str = turno_nuevo.fecha.strftime("%d/%m/%Y")
    hora_str = turno_nuevo.hora_inicio.strftime("%H:%M")

    if inscripto_en_espera:
        mensaje_exito = (
            f"No había cupo disponible para el {fecha_str} a las {hora_str} hs. "
            "Fuiste anotado en la lista de espera. Te notificaremos si se libera un cupo"
        )
    else:
        mensaje_exito = f"Turno reasignado con éxito para el {fecha_str} a las {hora_str} hs"
        await _enviar_confirmacion_reprogramacion_email(db, paciente_id, turno_viejo, area_vieja, turno_nuevo)

    return {"mensaje": mensaje_exito, "turno": turno_nuevo}


# HU-14: La secretaria cancela el turno de cualquier paciente
async def cancelar_turno_secretaria(
    db: AsyncSession,
    turno_id: UUID,
    secretaria_id: UUID,
) -> CancelarTurnoSecretariaResponse:
    # Todas las mutaciones sobre `turno` ocurren dentro de este bloque, que hace
    # exactamente UN commit al salir. No volver a asignar atributos de `turno`
    # después de este punto: cualquier escritura fuera de esta transacción
    # dispararía un UPDATE extra en el próximo flush/commit de la sesión.
    async with db.begin():
        turno = await obtener_turno_por_id_con_lock(db, turno_id)

        if not turno:
            raise HTTPException(status_code=404, detail="El turno no existe.")

        if turno.estado != EstadoTurno.RESERVADO:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede cancelar un turno con estado: {turno.estado}",
            )

        fecha_hora_turno = datetime.combine(turno.fecha, turno.hora_inicio)
        ahora = datetime.now(ARGENTINA_TZ).replace(tzinfo=None)
        con_menos_48hs = (fecha_hora_turno - ahora) < timedelta(hours=48)

        primer_espera = await obtener_primer_paciente_en_espera(db, turno.id)

        turno.paciente_id = None
        turno.area_tratamiento = None

        if primer_espera:
            # Se mantiene RESERVADO para que el turno siga "ocupado" hasta que
            # el primero en lista de espera confirme o se agote la lista.
            # (turno.estado ya es RESERVADO: SQLAlchemy no incluye esta
            # columna en el UPDATE porque el valor no cambia)
            turno.estado = EstadoTurno.RESERVADO
        else:
            turno.estado = EstadoTurno.DISPONIBLE

        turno_id_str = str(turno.id)

    # A partir de acá `turno` está commiteado y no se le vuelve a asignar
    # ningún atributo. Único efecto posterior al commit: encolar (o ejecutar
    # inline si no hay Celery/Redis) la oferta a la lista de espera.
    notificacion_enviada = False
    if primer_espera:
        from app.tasks.lista_espera import despachar_oferta_turno
        await despachar_oferta_turno(turno_id_str)
        notificacion_enviada = True

    if con_menos_48hs:
        mensaje = (
            "Turno cancelado. Se cobrará la totalidad del turno por cancelación "
            "con menos de 48 horas de anticipación"
        )
    else:
        mensaje = "Turno cancelado con éxito. Sin penalidad aplicada"

    if notificacion_enviada:
        mensaje += ". Se notificó al primero en lista de espera."

    return CancelarTurnoSecretariaResponse(
        mensaje=mensaje,
        turno_id=turno.id,
        fecha=turno.fecha,
        hora_inicio=turno.hora_inicio,
        notificacion_enviada=notificacion_enviada,
    )


# HU-12: La secretaria inscribe a un paciente en lista de espera
async def inscribir_paciente_lista_espera_secretaria(
    db: AsyncSession,
    turno_id: UUID,
    paciente_id: UUID,
    area_tratamiento: AreaTratamiento,
    secretaria_id: UUID,
) -> InscripcionListaEsperaResponse:
    async with db.begin():
        turno = await obtener_turno_por_id_con_lock(db, turno_id)

        # Verificar límite de lista de espera
        conteo = await db.scalar(
            select(func.count()).select_from(ListaEsperaModel).where(
                ListaEsperaModel.turno_id == turno_id,
                ListaEsperaModel.activo == True
            )
        )
        if conteo >= 5:
                raise ValueError("La lista de espera está completa (máximo 5 personas)")     
               
        if not turno:
            raise ValueError("El turno indicado no existe")

        if turno.estado == EstadoTurno.DISPONIBLE:
            raise ValueError("El turno tiene disponibilidad; no es necesario anotarse en lista de espera")

        if turno.estado != EstadoTurno.RESERVADO:
            raise ValueError("No es posible anotarse en lista de espera para este turno")

        from app.repositories.patients.patient_repository import get_patient_by_id
        if not get_patient_by_id(str(paciente_id)):
            raise ValueError("No hay pacientes para mostrar")

        existente = await verificar_paciente_en_lista(db, turno_id, paciente_id)
        if existente:
            raise ValueError("El paciente ya se encuentra registrado en la lista de espera de este turno")

        inscripcion = ListaEsperaModel(
            turno_id=turno_id,
            paciente_id=paciente_id,
            area_tratamiento=area_tratamiento,
        )
        db.add(inscripcion)

    return InscripcionListaEsperaResponse(
        mensaje="Paciente inscripto correctamente en la lista de espera",
        turno_id=turno_id,
    )


# HU: El paciente cancela su propia inscripción en lista de espera
async def cancelar_inscripcion_lista_espera_paciente(
    db: AsyncSession,
    inscripcion_id: UUID,
    paciente_id: UUID,
) -> dict:
    async with db.begin():
        inscripcion = await obtener_inscripcion_por_id(db, inscripcion_id)

        if not inscripcion or not inscripcion.activo:
            raise ValueError("No se encontró una inscripción activa para cancelar")

        if str(inscripcion.paciente_id) != str(paciente_id):
            raise ValueError("No tenés permiso para cancelar esta inscripción")

        inscripcion.activo = False
        db.add(inscripcion)

    return {"mensaje": "Inscripción cancelada correctamente"}


# HU-13: La secretaria cancela la inscripción en lista de espera de cualquier paciente
async def cancelar_inscripcion_lista_espera_secretaria(
    db: AsyncSession,
    inscripcion_id: UUID,
    secretaria_id: UUID,
) -> dict:
    async with db.begin():
        inscripcion = await obtener_inscripcion_por_id(db, inscripcion_id)

        if not inscripcion:
            raise ValueError("La inscripción no existe")

        if not inscripcion.activo:
            raise ValueError("La inscripción ya fue cancelada")

        inscripcion.activo = False
        db.add(inscripcion)

    return {"mensaje": "Reserva dada de baja exitosamente", "inscripcion_id": str(inscripcion_id)}


# HU-5: Reporte de ausentismo por rango de fechas
async def consultar_reporte_ausentismo(
    db: AsyncSession,
    fecha_desde: date,
    fecha_hasta: date,
) -> ReporteAusentismoResponse:
    ausencias = await obtener_ausencias_por_rango(db, fecha_desde, fecha_hasta)

    agrupado: dict[str, dict] = {}
    for turno in ausencias:
        pid = str(turno.paciente_id)
        if pid not in agrupado:
            agrupado[pid] = {"paciente_id": turno.paciente_id, "fechas": []}
        agrupado[pid]["fechas"].append(turno.fecha)

    resultado = [
        AusentismoResponse(
            paciente_id=datos["paciente_id"],
            total_ausencias=len(datos["fechas"]),
            fechas=datos["fechas"],
        )
        for datos in agrupado.values()
    ]

    mensaje = None
    if not resultado:
        mensaje = "No se encontraron registros de ausentismo para el período seleccionado"

    return ReporteAusentismoResponse(
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        total_pacientes_ausentes=len(resultado),
        ausencias=resultado,
        mensaje=mensaje,
    )


# HU-15: Obtener info de turno validando JWT (endpoint público)
async def obtener_info_turno_por_token(db: AsyncSession, token: str) -> TurnoInfoTokenResponse:
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError:
        raise ValueError("Este link ya no es válido. El tiempo para aceptar el turno ha expirado")

    turno_id_str = payload.get("turno_id")
    inscripcion_id_str = payload.get("inscripcion_id")
    if not turno_id_str or not inscripcion_id_str:
        raise ValueError("Este link ya no es válido. El tiempo para aceptar el turno ha expirado")

    inscripcion = await obtener_inscripcion_por_id(db, UUID(inscripcion_id_str))
    if not inscripcion:
        raise ValueError("Este link ya no es válido. El cupo ya fue asignado a otro paciente")
    if not inscripcion.activo:
        # La inscripción existe pero ya fue resuelta (aceptada, rechazada o vencida):
        # el token es válido pero quedó obsoleto, distinto de un token inválido/corrupto.
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Este link ya fue usado. El cupo ya fue asignado a otro paciente",
        )

    turno = await obtener_turno_por_id_simple(db, UUID(turno_id_str))
    if not turno:
        raise ValueError("El turno no existe")

    area_tratamiento = payload.get("area_tratamiento") or (
        turno.area_tratamiento.value if turno.area_tratamiento else None
    )

    return TurnoInfoTokenResponse(
        turno_id=turno.id,
        fecha=turno.fecha,
        hora_inicio=turno.hora_inicio,
        hora_fin=turno.hora_fin,
        area_tratamiento=area_tratamiento,
    )


# HU-15: Aceptar turno desde link de lista de espera
async def aceptar_turno_por_token(db: AsyncSession, token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError:
        raise ValueError("Este link ya no es válido. El tiempo para aceptar el turno ha expirado")

    turno_id = UUID(payload.get("turno_id"))
    inscripcion_id = UUID(payload.get("inscripcion_id"))
    paciente_id = UUID(payload.get("paciente_id"))

    async with db.begin():
        # SELECT FOR UPDATE para evitar race condition
        from sqlalchemy import select as sa_select
        result_i = await db.execute(
            sa_select(ListaEsperaModel)
            .where(ListaEsperaModel.id == inscripcion_id)
            .with_for_update()
        )
        inscripcion = result_i.scalar_one_or_none()

        if not inscripcion or not inscripcion.activo:
            raise ValueError("Este link ya no es válido. El cupo ya fue asignado a otro paciente")

        turno = await obtener_turno_por_id_con_lock(db, turno_id)
        if not turno:
            raise ValueError("El turno no existe")


        # El turno debe estar "pendiente de oferta": RESERVADO pero sin paciente asignado
        if turno.estado != EstadoTurno.RESERVADO or turno.paciente_id is not None:
            raise ValueError("El turno ya no está disponible")

        turno.paciente_id = paciente_id
        turno.area_tratamiento = inscripcion.area_tratamiento
        inscripcion.activo = False

        db.add(turno)
        db.add(inscripcion)

    await _enviar_confirmacion_turno_email(db, paciente_id, turno)

    fecha_str = turno.fecha.strftime("%d/%m/%Y")
    hora_str = turno.hora_inicio.strftime("%H:%M")
    return {"mensaje": f"Turno reservado con éxito para el {fecha_str} a las {hora_str} hs"}


# HU-15: Rechazar turno desde link de lista de espera
async def rechazar_turno_por_token(db: AsyncSession, token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError:
        raise ValueError("Este link ya no es válido. El tiempo para aceptar el turno ha expirado")

    turno_id_str = payload.get("turno_id")
    inscripcion_id = UUID(payload.get("inscripcion_id"))

    async with db.begin():
        from sqlalchemy import select as sa_select
        result_i = await db.execute(
            sa_select(ListaEsperaModel)
            .where(ListaEsperaModel.id == inscripcion_id)
            .with_for_update()
        )
        inscripcion = result_i.scalar_one_or_none()

        if not inscripcion or not inscripcion.activo:
            raise ValueError("Este link ya no es válido. El cupo ya fue asignado a otro paciente")

        inscripcion.activo = False
        db.add(inscripcion)

    from app.tasks.lista_espera import despachar_oferta_turno
    await despachar_oferta_turno(turno_id_str)

    return {"mensaje": "Rechazaste el turno. El cupo será ofrecido al siguiente paciente en lista de espera"}

# ver lista de espera (paciente)
async def ver_mis_inscripciones_lista_espera(db: AsyncSession, paciente_id: UUID):
    # ¡Obligatorio el await acá porque la función de arriba ahora es asíncrona!
    resultados = await obtener_inscripciones_lista_espera_por_paciente(db, paciente_id)
    inscripciones_formateadas = []
    
    for lista_obj, turno_obj in resultados:
        # Consulta asíncrona correcta para contar registros (Count)
        query_posicion = (
            select(func.count())
            .select_from(ListaEsperaModel)
            .where(
                ListaEsperaModel.turno_id == lista_obj.turno_id,
                ListaEsperaModel.activo == True,
                ListaEsperaModel.fecha_inscripcion <= lista_obj.fecha_inscripcion.replace(tzinfo=None) 
            )
        )
        # db.scalar() ejecuta la consulta y te devuelve directamente el número (el entero del count)
        posicion = await db.scalar(query_posicion)
            
        inscripciones_formateadas.append({
            "inscripcion_id": lista_obj.id,
            "turno_id": turno_obj.id,
            "fecha": turno_obj.fecha,
            "hora_inicio": turno_obj.hora_inicio,
            "hora_fin": turno_obj.hora_fin,
            "area_tratamiento": turno_obj.area_tratamiento,
            "fecha_inscripcion": lista_obj.fecha_inscripcion,
            "posicion": posicion
        })
        
    return {
        "inscripciones": inscripciones_formateadas,
        "total": len(inscripciones_formateadas)
    }
#Cancelar lista de espera (paciente)
async def cancelar_inscripcion_lista_espera(db: AsyncSession, inscripcion_id: UUID, paciente_id: UUID):
    # Reemplazamos db.query por select()
    query = select(ListaEsperaModel).where(
        ListaEsperaModel.id == inscripcion_id, 
        ListaEsperaModel.paciente_id == paciente_id
    )
    result = await db.execute(query)
    
    # .scalar_one_or_none() equivale al antiguo .first() pero más seguro para traer un solo objeto
    inscripcion = result.scalar_one_or_none()
    
    if inscripcion:
        inscripcion.activo = False  # Baja lógica
        await db.commit()           # ¡Obligatorio el await en el commit!
        return True
    return False

async def consultar_turnos_con_lista_espera_activa(db: AsyncSession):
    from app.repositories.shifts.turnos import obtener_turnos_con_lista_espera_activa
    turnos = await obtener_turnos_con_lista_espera_activa(db)
    return turnos
