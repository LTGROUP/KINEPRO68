from pydantic import BaseModel, field_validator, model_validator
from datetime import date, time, datetime
from typing import Optional, List
from uuid import UUID
from app.models.turno import EstadoTurno, AreaTratamiento

# ── Request: Generar grilla (Escenario 1, 2 y 3) ─────────────────
class FranjaHoraria(BaseModel):
    hora_inicio: time
    hora_fin: time

    @model_validator(mode="after")
    def validar_franja(self):
        if self.hora_fin <= self.hora_inicio:
            raise ValueError("La hora de fin debe ser posterior a la hora de inicio")
        return self

class GenerarGrillaRequest(BaseModel):
    mes: int
    anio: int
    franjas: List[FranjaHoraria]        # soporta horario corrido y cortado
    turnos_por_slot: int
    dias_habiles: List[str]
    dias_cerrados: Optional[List[date]] = []

    @field_validator("mes")
    @classmethod
    def validar_mes(cls, v):
        if not 1 <= v <= 12:
            raise ValueError("El mes debe estar entre 1 y 12")
        return v

    @field_validator("turnos_por_slot")
    @classmethod
    def validar_turnos(cls, v):
        if v < 1:
            raise ValueError("Debe haber al menos 1 turno por slot")
        return v

    @field_validator("franjas")
    @classmethod
    def validar_franjas(cls, v):
        if not v:
            raise ValueError("Debe haber al menos una franja horaria")
        # verificar que no se superpongan
        franjas_ordenadas = sorted(v, key=lambda f: f.hora_inicio)
        for i in range(len(franjas_ordenadas) - 1):
            if franjas_ordenadas[i].hora_fin > franjas_ordenadas[i+1].hora_inicio:
                raise ValueError("Las franjas horarias no pueden superponerse")
        return franjas_ordenadas


# ── Request: Bloquear día completo (Escenario 4) ─────────────────
class BloquearDiaRequest(BaseModel):
    fecha: date
    motivo: Optional[str] = "Bloqueado por administración"


# ── Request/Response: Día cerrado (calendario de grilla) ──────────
class DiaCerradoRequest(BaseModel):
    fecha: date
    motivo: Optional[str] = None
    horario_inicio: Optional[time] = None
    horario_fin: Optional[time] = None

    @model_validator(mode="after")
    def validar_horario_reducido(self):
        if (self.horario_inicio is None) != (self.horario_fin is None):
            raise ValueError("horario_inicio y horario_fin deben venir juntos o ambos vacíos")
        if self.horario_inicio is not None and self.horario_fin <= self.horario_inicio:
            raise ValueError("horario_fin debe ser posterior a horario_inicio")
        return self


class DiaCerradoResponse(BaseModel):
    mensaje: str
    fecha: date
    horario_inicio: Optional[time] = None
    horario_fin: Optional[time] = None


class EliminarDiaCerradoResponse(BaseModel):
    mensaje: str


class DiaCerradoItem(BaseModel):
    fecha: date
    motivo: Optional[str] = None
    horario_inicio: Optional[time] = None
    horario_fin: Optional[time] = None

    model_config = {"from_attributes": True}


class DiasCerradosListResponse(BaseModel):
    dias_cerrados: List[DiaCerradoItem]


# ── Request: Modificar cantidad de turnos por rango (Escenario 5) ─
class ModificarCuposRangoRequest(BaseModel):
    fecha_desde: date
    fecha_hasta: date

    @model_validator(mode="after")
    def validar_rango(self):
        if self.fecha_hasta < self.fecha_desde:
            raise ValueError("La fecha de fin debe ser posterior a la fecha de inicio")
        return self


# ── Response: Turno individual ────────────────────────────────────
class TurnoResponse(BaseModel):
    id: UUID
    fecha: date
    hora_inicio: time
    hora_fin: time
    estado: EstadoTurno
    area_tratamiento: Optional[AreaTratamiento]
    paciente_id: Optional[UUID]
    profesional_id: Optional[UUID]

    model_config = {"from_attributes": True}


# ── Response: Resultado de generación de grilla ───────────────────
class GrillaGeneradaResponse(BaseModel):
    mensaje: str
    mes: int
    anio: int
    total_turnos_creados: int
    dias_omitidos: List[date]


# ── Response: Resultado de bloqueo de día ────────────────────────
class BloquearDiaResponse(BaseModel):
    mensaje: str
    fecha: date
    turnos_eliminados: int
    pacientes_a_contactar: List[UUID]   # ids de pacientes con turno ya reservado


# ── Response: Resultado de modificación de cupos ─────────────────
class ModificarCuposResponse(BaseModel):
    mensaje: str
    fecha_desde: date
    fecha_hasta: date
    turnos_reducidos: int
    pacientes_a_contactar: List[UUID]

# ── Response: Turno disponible para paciente ──────────────────────
class TurnoDisponibleResponse(BaseModel):
    id: UUID
    hora_inicio: time
    hora_fin: time
    area_tratamiento: Optional[AreaTratamiento]
    estado: EstadoTurno

    model_config = {"from_attributes": True}


# ── Response: Lista de turnos disponibles ────────────────────────
class TurnosDisponiblesResponse(BaseModel):
    fecha: date
    turnos: List[TurnoDisponibleResponse]
    total: int

    model_config = {"from_attributes": True}

# ── Request: Solicitar turno (HU26) ──────────────────────────────
class SolicitarTurnoRequest(BaseModel):
    turno_id: UUID
    area_tratamiento: AreaTratamiento
    paciente_id: Optional[UUID] = None


# ── Request: Registro manual de turno por secretaria ──────────────
class RegistrarTurnoManualRequest(BaseModel):
    turno_id: UUID
    paciente_id: UUID
    area_tratamiento: AreaTratamiento


# ── Response: Turno solicitado ────────────────────────────────────
class TurnoSolicitadoResponse(BaseModel):
    mensaje: str
    turno_id: UUID
    fecha: date
    hora_inicio: time
    hora_fin: time
    area_tratamiento: AreaTratamiento

    model_config = {"from_attributes": True}

class MiTurnoResponse(BaseModel):
    id: UUID
    fecha: date
    hora_inicio: time
    hora_fin: time
    area_tratamiento: Optional[AreaTratamiento]
    estado: EstadoTurno

    model_config = {"from_attributes": True}

class MisTurnosResponse(BaseModel):
    turnos: List[MiTurnoResponse]
    total: int
    mensaje: Optional[str] = None


class PacienteEnEsperaResponse(BaseModel):
    id: UUID
    paciente_id: UUID
    fecha_inscripcion: datetime
    posicion: int
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    dni: Optional[str] = None

    model_config = {"from_attributes": True}


class ListaEsperaResponse(BaseModel):
    turno_id: UUID
    pacientes: List[PacienteEnEsperaResponse]
    total: int
    mensaje: Optional[str] = None

class InscripcionListaEsperaResponse(BaseModel):
    mensaje: str
    turno_id: UUID

    model_config = {"from_attributes": True}

class TurnoFechaResponse(BaseModel):
    id: UUID
    hora_inicio: time
    hora_fin: time
    estado: EstadoTurno
    area_tratamiento: Optional[AreaTratamiento] = None

    model_config = {"from_attributes": True}

class TurnosFechaResponse(BaseModel):
    fecha: date
    turnos: List[TurnoFechaResponse]
    total: int
    turnos_por_slot: int

class CancelarTurnoResponse(BaseModel):
    mensaje: Optional[str] = None
    turno: TurnoResponse
    mensaje_lista_espera: str

    model_config = {"from_attributes": True}

class PacienteAgendaInfo(BaseModel):
    id: UUID
    nombre: str
    apellido: str
    dni: str

    model_config = {"from_attributes": True}


class AgendaTurnoResponse(BaseModel):
    id: UUID
    hora_inicio: time
    hora_fin: time
    estado: EstadoTurno
    area_tratamiento: Optional[AreaTratamiento] = None
    paciente: Optional[PacienteAgendaInfo] = None

    model_config = {"from_attributes": True}


class AgendaDiariaResponse(BaseModel):
    fecha: date
    turnos: List[AgendaTurnoResponse]
    total: int

    model_config = {"from_attributes": True}

# ── Request: Inscribirse en Lista de Espera ───────────────────────
class InscripcionListaEsperaRequest(BaseModel):
    area_tratamiento: AreaTratamiento

class ActualizarEstadoRequest(BaseModel):
    nuevo_estado: EstadoTurno

class ReprogramarTurnoRequest(BaseModel):
    nuevo_turno_id: UUID
    area_tratamiento: str


# ── HU-14: Cancelar turno (secretaria) ───────────────────────────
class CancelarTurnoSecretariaResponse(BaseModel):
    mensaje: str
    turno_id: UUID
    fecha: date
    hora_inicio: time
    notificacion_enviada: bool


# ── HU-12: Inscribir paciente en lista de espera (secretaria) ────
class InscribirPacienteListaEsperaRequest(BaseModel):
    paciente_id: UUID
    area_tratamiento: AreaTratamiento


# ── HU-5: Reporte de ausentismo ───────────────────────────────────
class AusentismoResponse(BaseModel):
    paciente_id: UUID
    total_ausencias: int
    fechas: List[date]


class ReporteAusentismoResponse(BaseModel):
    fecha_desde: date
    fecha_hasta: date
    total_pacientes_ausentes: int
    ausencias: List[AusentismoResponse]
    mensaje: Optional[str] = None


# ── HU-13: Cancelar inscripción en lista de espera (paciente) ────
class CancelarInscripcionResponse(BaseModel):
    mensaje: str


# ── HU-15: Info de turno por token ───────────────────────────────
class TurnoInfoTokenResponse(BaseModel):
    turno_id: UUID
    fecha: date
    hora_inicio: time
    hora_fin: time
    area_tratamiento: Optional[str] = None


# ── Agenda del profesional ────────────────────────────────────────
class AgendaProfesionalTurnoResponse(BaseModel):
    id: UUID
    fecha: date
    hora_inicio: time
    hora_fin: time
    area_tratamiento: Optional[AreaTratamiento] = None
    estado: EstadoTurno
    paciente_id: Optional[UUID] = None
    paciente: Optional[PacienteAgendaInfo] = None

    model_config = {"from_attributes": True}

# Ver turnos en lista de espera (paciente)
class MiInscripcionListaEsperaResponse(BaseModel):
    inscripcion_id: UUID
    turno_id: UUID
    fecha: date
    hora_inicio: time
    hora_fin: time
    area_tratamiento: Optional[str] = None
    fecha_inscripcion: datetime
    posicion: int

    model_config = {"from_attributes": True}

class MisInscripcionesListaEsperaResponse(BaseModel):
    inscripciones: List[MiInscripcionListaEsperaResponse]
    total: int

# Esquema correcto para la secretaria consultar la lista de espera de un turno
class TurnoConListaEsperaResponse(BaseModel):
    id: UUID
    fecha: date
    hora_inicio: time
    hora_fin: time
    area_tratamiento: Optional[AreaTratamiento] = None
    estado: EstadoTurno
    paciente: Optional[PacienteAgendaInfo] = None
    cantidad_en_espera: int = 0

    model_config = {"from_attributes": True}

class AgendaProfesionalResponse(BaseModel):
    fecha: date
    turnos: List[AgendaProfesionalTurnoResponse]
    total: int

class TurnosConListaEsperaResponse(BaseModel):
    turnos: List[TurnoConListaEsperaResponse]
    total: int


# ── Editar horario de un día ya generado ──────────────────────────
class EditarHorarioDiaRequest(BaseModel):
    hora_inicio: time
    hora_fin: time

    @model_validator(mode="after")
    def validar_horario(self):
        if self.hora_fin <= self.hora_inicio:
            raise ValueError("La hora de fin debe ser posterior a la hora de inicio")
        return self


class EditarHorarioDiaResponse(BaseModel):
    mensaje: str
    turnos_creados: int
    turnos_reservados_conservados: int
