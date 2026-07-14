from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from datetime import date
from uuid import UUID
from typing import Optional

from app.models.turno import EstadoTurno, AreaTratamiento, ListaEspera as ListaEsperaModel

from app.api.dependencies.auth import (
    get_current_profile as get_current_user,
    get_current_staff_manager_profile as get_current_secretaria,

)
from app.db.session import get_db
from app.schemas.shifts.turno import (
    TurnosDisponiblesResponse,
    TurnoDisponibleResponse,
    SolicitarTurnoRequest,
    TurnoSolicitadoResponse,
    MisTurnosResponse,
    ListaEsperaResponse,
    TurnosFechaResponse,
    TurnoFechaResponse,
    AgendaDiariaResponse,
    ActualizarEstadoRequest,
    InscripcionListaEsperaResponse,
    InscripcionListaEsperaRequest,
    ReprogramarTurnoRequest,
    CancelarTurnoSecretariaResponse,
    CancelarInscripcionResponse,
    InscribirPacienteListaEsperaRequest,
    ReporteAusentismoResponse,
    TurnoInfoTokenResponse,
    RegistrarTurnoManualRequest,
    MisInscripcionesListaEsperaResponse,
    TurnoConListaEsperaResponse,
    TurnosConListaEsperaResponse
)
from app.models.turno import EstadoTurno
from app.services.shifts.turnos_service import (
    consultar_turnos_disponibles,
    solicitar_turno,
    registrar_turno_manual_secretaria,
    ver_mis_turnos,
    consultar_lista_espera,
    cancelar_turno,
    cancelar_turno_secretaria,
    consultar_agenda_diaria,
    marcar_asistencia_turno,
    inscribirse_lista_espera,
    inscribir_paciente_lista_espera_secretaria,
    cancelar_inscripcion_lista_espera_paciente,
    cancelar_inscripcion_lista_espera_secretaria,
    consultar_turnos_para_paciente,
    reprogramar_turno,
    consultar_todos_turnos_fecha,
    consultar_metricas_cancelaciones,
    consultar_reporte_ausentismo,
    obtener_info_turno_por_token,
    aceptar_turno_por_token,
    rechazar_turno_por_token,
    ver_mis_inscripciones_lista_espera, 
    cancelar_inscripcion_lista_espera,
    consultar_turnos_con_lista_espera_activa
)

router = APIRouter(prefix="/turnos", tags=["Turnos"])

#lista de espera (paciente)
# RUTA OBTENER INSCRIPCIONES
@router.get("/lista-espera/mis-inscripciones", response_model=MisInscripcionesListaEsperaResponse)
async def get_mis_inscripciones_lista_espera(
    db: AsyncSession = Depends(get_db),
    paciente = Depends(get_current_user)
):
    return await ver_mis_inscripciones_lista_espera(db, paciente["id"])

# RUTA CANCELAR INSCRIPCIÓN
@router.delete("/lista-espera/mis-inscripciones/{inscripcion_id}")
async def delete_mi_inscripcion_lista_espera(
    inscripcion_id: UUID,

    db: AsyncSession = Depends(get_db), # Cambiado Session por AsyncSession

    paciente = Depends(get_current_user)
):
    exito = await cancelar_inscripcion_lista_espera(db, inscripcion_id, paciente["id"])
    if not exito:
        raise HTTPException(status_code=404, detail="Inscripción en lista de espera no encontrada.")
    return {"mensaje": "Se ha cancelado tu lugar en la lista de espera correctamente."}

@router.get(
    "/disponibles",
    response_model=TurnosDisponiblesResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener turnos disponibles para una fecha",
    description="Lista de turnos disponibles para que el paciente elija cuándo tratarse.",
)
async def obtener_turnos_disponibles(
    fecha: date = Query(..., description="Fecha en formato YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    try:
        resultado = await consultar_turnos_disponibles(db, fecha)
        
        if isinstance(resultado, dict) and "mensaje" in resultado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=resultado["mensaje"],
            )
        
        turnos_response = [
            TurnoDisponibleResponse.model_validate(turno)
            for turno in resultado
        ]
        
        return TurnosDisponiblesResponse(
            fecha=fecha,
            turnos=turnos_response,
            total=len(turnos_response),
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.get(
    "/paciente",
    response_model=TurnosDisponiblesResponse,
    status_code=status.HTTP_200_OK,
    summary="Consultar turnos para paciente",
    description="Devuelve los turnos disponibles y ocupados para que el paciente pueda solicitar turno o anotarse en lista de espera.",
)
async def obtener_turnos_para_paciente_endpoint(
    fecha: date = Query(..., description="Fecha en formato YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    try:
        resultado = await consultar_turnos_para_paciente(
            db=db,
            fecha_buscada=fecha,
        )

        if isinstance(resultado, dict) and "mensaje" in resultado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=resultado["mensaje"],
            )

        turnos_response = [
            TurnoDisponibleResponse.model_validate(turno)
            for turno in resultado
        ]

        return TurnosDisponiblesResponse(
            fecha=fecha,
            turnos=turnos_response,
            total=len(turnos_response),
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.post(
    "/solicitar",
    response_model=TurnoSolicitadoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Solicitar un turno",
    description="El paciente reserva un turno disponible por tipo de tratamiento.",
)
async def solicitar_turno_endpoint(
    request: SolicitarTurnoRequest,
    db: AsyncSession = Depends(get_db),
    paciente=Depends(get_current_user),
):
    actor_role = paciente.get("rol")

    if actor_role == "profesional":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesionales no pueden solicitar turnos como pacientes",
        )
    try:
        from uuid import UUID

        id_paciente = UUID(str(paciente["id"])) if isinstance(paciente["id"], str) else paciente["id"]

        if request.paciente_id:
            if actor_role not in ["secretaria", "administrativo"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tenes permisos para asignar turnos a otro paciente",
                )

            from app.repositories.patients.patient_repository import get_patient_by_id
            if not get_patient_by_id(str(request.paciente_id)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El paciente indicado no existe",
                )

            id_paciente = request.paciente_id

        return await solicitar_turno(
            db=db,
            request=request,
            paciente_id=id_paciente,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.post(
    "/registrar-manual",
    response_model=TurnoSolicitadoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar turno manual para un paciente (secretaria)",
    description="La secretaria reserva un turno disponible a nombre de un paciente puntual.",
)
async def registrar_turno_manual_endpoint(
    request: RegistrarTurnoManualRequest,
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    try:
        id_secretaria = UUID(str(secretaria["id"])) if isinstance(secretaria["id"], str) else secretaria["id"]

        return await registrar_turno_manual_secretaria(
            db=db,
            turno_id=request.turno_id,
            paciente_id=request.paciente_id,
            area_tratamiento=request.area_tratamiento,
            secretaria_id=id_secretaria,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/mis-turnos",
    response_model=MisTurnosResponse,
    status_code=status.HTTP_200_OK,
    summary="Ver mis turnos",
    description="Lista los turnos reservados del paciente autenticado.",
)
async def ver_mis_turnos_endpoint(
    db: AsyncSession = Depends(get_db),
    paciente=Depends(get_current_user),
):
    if paciente.get("rol") == "profesional":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesionales no pueden solicitar turnos como pacientes",
        )
    try:
        from uuid import UUID
        id_paciente = UUID(str(paciente["id"])) if isinstance(paciente["id"], str) else paciente["id"]
        
        return await ver_mis_turnos(
            db=db,
            paciente_id=id_paciente,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
            
@router.get(
    "/todos",
    response_model=TurnosFechaResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener todos los turnos de una fecha (secretaria)",
    description="Lista todos los turnos (cualquier estado) para que la secretaria pueda consultar listas de espera.",
)
async def obtener_todos_turnos_endpoint(
    fecha: date = Query(..., description="Fecha en formato YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    turnos, turnos_por_slot = await consultar_todos_turnos_fecha(db, fecha)
    return TurnosFechaResponse(
        fecha=fecha,
        turnos=[TurnoFechaResponse.model_validate(t) for t in turnos],
        total=len(turnos),
        turnos_por_slot=turnos_por_slot,
    )

@router.get(
    "/lista-espera/activas",
    response_model=TurnosConListaEsperaResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener todos los turnos con lista de espera activa (secretaria)",
)
async def obtener_turnos_lista_espera_activa(
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    turnos = await consultar_turnos_con_lista_espera_activa(db)
    turnos_response = []
    for turno, cantidad in turnos:
        turno_resp = TurnoConListaEsperaResponse.model_validate(turno)
        turno_resp.cantidad_en_espera = cantidad
        turnos_response.append(turno_resp)

    return TurnosConListaEsperaResponse(
        turnos=turnos_response,
        total=len(turnos_response),
    )

# ── HU: Cancelar inscripción propia en lista de espera (paciente) ─────────────
# IMPORTANTE: declarada antes de /{turno_id}/lista-espera para evitar conflictos de rutas

@router.patch(
    "/lista-espera/{inscripcion_id}/cancelar",
    response_model=CancelarInscripcionResponse,
    status_code=status.HTTP_200_OK,
    summary="Cancelar inscripción propia en lista de espera (paciente)",
    description="El paciente cancela su propia inscripción activa en la lista de espera.",
)
async def cancelar_inscripcion_lista_espera_paciente_endpoint(
    inscripcion_id: UUID,
    db: AsyncSession = Depends(get_db),
    paciente=Depends(get_current_user),
):
    try:
        resultado = await cancelar_inscripcion_lista_espera_paciente(
            db=db,
            inscripcion_id=inscripcion_id,
            paciente_id=UUID(str(paciente["id"])),
        )
        return CancelarInscripcionResponse(mensaje=resultado["mensaje"])
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/{turno_id}/lista-espera",
    response_model=ListaEsperaResponse,
    status_code=status.HTTP_200_OK,
    summary="Consultar lista de espera de un turno",
    description="Lista los pacientes en espera ordenados por prioridad. Solo secretarias.",
)
async def consultar_lista_espera_endpoint(
    turno_id: UUID,
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    try:
        return await consultar_lista_espera(
            db=db,
            turno_id=turno_id,
            actor_role=secretaria["rol"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
@router.post(
    "/{turno_id}/lista-espera",
    response_model=InscripcionListaEsperaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Inscribirse en lista de espera",
    description="Permite a un paciente anotarse en la lista de espera de un turno ocupado.",
)
async def inscribirse_lista_espera_endpoint(
    turno_id: UUID,
    request: InscripcionListaEsperaRequest,
    db: AsyncSession = Depends(get_db),
    paciente=Depends(get_current_user),
):
    if paciente.get("rol") == "profesional":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesionales no pueden solicitar turnos como pacientes",
        )
    try:
        return await inscribirse_lista_espera(
            db=db,
            turno_id=turno_id,
            paciente_id=paciente["id"],
            area_tratamiento=request.area_tratamiento,   
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch(
    "/{turno_id}/cancelar",
    status_code=status.HTTP_200_OK,
    summary="Cancelar un turno reservado",
    description="El paciente cancela un turno propio. Si faltan menos de 48hs, avisa que no podrá reasignarlo.",
)
async def cancelar_turno_endpoint(
    turno_id: UUID,
    db: AsyncSession = Depends(get_db),
    paciente=Depends(get_current_user),
):
    if paciente.get("rol") == "profesional":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesionales no pueden solicitar turnos como pacientes",
        )
    try:
        return await cancelar_turno(db=db, turno_id=turno_id, paciente_id=paciente["id"])
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
@router.get(
    "/agenda",
    response_model=AgendaDiariaResponse,
    status_code=status.HTTP_200_OK,
    summary="Consultar agenda completa del día",
)
async def obtener_agenda_del_dia_endpoint(
    fecha: date = Query(..., description="Fecha en formato YYYY-MM-DD"),
    area: Optional[str] = Query(None, description="Filtrar por área (ej: tren_superior)"),
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    try:
        return await consultar_agenda_diaria(
            db=db, 
            fecha_buscada=fecha, 
            actor_role=secretaria["rol"],
            area=area
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
@router.patch(
    "/{turno_id}/asistencia",
    status_code=status.HTTP_200_OK,
    summary="Marcar presencia o ausencia del paciente",
)
async def marcar_asistencia_endpoint(
    turno_id: UUID,
    request: ActualizarEstadoRequest,
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    try:
        resultado = await marcar_asistencia_turno(
            db=db,
            turno_id=turno_id,
            nuevo_estado=request.nuevo_estado
        )
        return {"mensaje": "Ausencia registrada con éxito"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
@router.patch(
    "/{turno_id}/reprogramar",
    status_code=status.HTTP_200_OK,
    summary="Reasignar un turno",
    description="Libera un turno actual y reserva uno nuevo respetando las reglas de la HU.",
)
async def reprogramar_turno_endpoint(
    turno_id: UUID,
    request: ReprogramarTurnoRequest,
    db: AsyncSession = Depends(get_db),
    paciente=Depends(get_current_user),
):
    try:
        resultado = await reprogramar_turno(
            db=db,
            turno_viejo_id=turno_id,
            nuevo_turno_id=request.nuevo_turno_id,
            paciente_id=UUID(str(paciente["id"])),
            nueva_area=request.area_tratamiento,
        )
        return {"mensaje": resultado["mensaje"]}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.get(
    "/metricas",
    status_code=status.HTTP_200_OK,
    summary="Métricas de cancelaciones",
)
async def obtener_metricas_endpoint(
    mes: Optional[int] = Query(None, description="Mes a filtrar (1-12)"),
    anio: Optional[int] = Query(None, description="Año a filtrar"),
    rango: Optional[str] = Query(None, description="Rango de tiempo (ej: ultimos_6_meses)"),
    db: AsyncSession = Depends(get_db),
    usuario=Depends(get_current_user)
):
    if usuario["rol"] not in ["secretaria", "administrativo"]:
        raise HTTPException(status_code=403, detail="No tenés permiso para ver las métricas.")
    try:
        return await consultar_metricas_cancelaciones(db, mes=mes, anio=anio, rango=rango)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── HU-14: Cancelar turno (secretaria) ───────────────────────────────────────

@router.patch(
    "/{turno_id}/cancelar-secretaria",
    response_model=CancelarTurnoSecretariaResponse,
    status_code=status.HTTP_200_OK,
    summary="Cancelar turno de cualquier paciente (secretaria)",
    description="La secretaria cancela el turno de un paciente. Si hay lista de espera, se notifica al primero.",
)
async def cancelar_turno_secretaria_endpoint(
    turno_id: UUID,
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    try:
        return await cancelar_turno_secretaria(
            db=db,
            turno_id=turno_id,
            secretaria_id=UUID(str(secretaria["id"])),
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── HU-12: Inscribir paciente en lista de espera (secretaria) ────────────────

@router.post(
    "/{turno_id}/lista-espera/secretaria",
    response_model=InscripcionListaEsperaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Inscribir paciente en lista de espera (secretaria)",
    description="La secretaria inscribe a un paciente en la lista de espera de un turno lleno.",
)
async def inscribir_lista_espera_secretaria_endpoint(
    turno_id: UUID,
    request: InscribirPacienteListaEsperaRequest,
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    try:
        return await inscribir_paciente_lista_espera_secretaria(
            db=db,
            turno_id=turno_id,
            paciente_id=request.paciente_id,
            area_tratamiento=request.area_tratamiento,
            secretaria_id=UUID(str(secretaria["id"])),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── HU-13: Cancelar inscripción en lista de espera (secretaria) ──────────────

@router.patch(
    "/lista-espera/{inscripcion_id}/cancelar-secretaria",
    status_code=status.HTTP_200_OK,
    summary="Cancelar inscripción en lista de espera (secretaria)",
    description="La secretaria cancela la inscripción de cualquier paciente en la lista de espera.",
)
async def cancelar_inscripcion_lista_espera_secretaria_endpoint(
    inscripcion_id: UUID,
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    try:
        return await cancelar_inscripcion_lista_espera_secretaria(
            db=db,
            inscripcion_id=inscripcion_id,
            secretaria_id=UUID(str(secretaria["id"])),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── HU-15: Endpoints públicos de aceptar/rechazar turno por token ─────────────

@router.get(
    "/lista-espera/info",
    response_model=TurnoInfoTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener info del turno ofertado (sin auth, por token)",
    description="Valida el token JWT y devuelve los datos del turno para mostrar en la pantalla pública.",
)
async def obtener_info_turno_token_endpoint(
    response: Response,
    token: str = Query(..., description="Token JWT recibido por email"),
    db: AsyncSession = Depends(get_db),
):
    # El token es de un solo uso: evitamos que el browser lo sirva desde caché
    # en una recarga o navegación hacia atrás.
    response.headers["Cache-Control"] = "no-store"
    try:
        return await obtener_info_turno_por_token(db=db, token=token)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/lista-espera/aceptar",
    status_code=status.HTTP_200_OK,
    summary="Aceptar turno desde link de lista de espera (sin auth)",
    description="El paciente acepta el turno ofertado. El turno pasa a RESERVADO a su nombre.",
)
async def aceptar_turno_token_endpoint(
    token: str = Query(..., description="Token JWT recibido por email"),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await aceptar_turno_por_token(db=db, token=token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/lista-espera/rechazar",
    status_code=status.HTTP_200_OK,
    summary="Rechazar turno desde link de lista de espera (sin auth)",
    description="El paciente rechaza el turno. Se oferta al siguiente en lista de espera.",
)
async def rechazar_turno_token_endpoint(
    token: str = Query(..., description="Token JWT recibido por email"),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await rechazar_turno_por_token(db=db, token=token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── HU-5: Reporte de ausentismo ──────────────────────────────────────────────

@router.get(
    "/reportes/ausentismo",
    response_model=ReporteAusentismoResponse,
    status_code=status.HTTP_200_OK,
    summary="Reporte de ausentismo por rango de fechas",
    description="Agrupa turnos AUSENTES por paciente en el rango indicado.",
)
async def obtener_reporte_ausentismo_endpoint(
    fecha_desde: date = Query(..., description="Fecha de inicio YYYY-MM-DD"),
    fecha_hasta: date = Query(..., description="Fecha de fin YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    secretaria=Depends(get_current_secretaria),
):
    if fecha_hasta < fecha_desde:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fecha_hasta debe ser posterior a fecha_desde",
        )
    try:
        return await consultar_reporte_ausentismo(db=db, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
