# app/models/turno.py
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Date, Time, DateTime,
    Boolean, Enum as SAEnum, ForeignKey, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class AreaTratamiento(str, enum.Enum):
    TREN_SUPERIOR = "tren_superior"
    TREN_MEDIO    = "tren_medio"
    TREN_INFERIOR = "tren_inferior"


class EstadoTurno(str, enum.Enum):
    DISPONIBLE   = "disponible"    # Cupo libre, nadie lo reservó
    RESERVADO    = "reservado"     # Paciente asignado
    BLOQUEADO    = "bloqueado"     # Día cerrado / feriado
    CANCELADO    = "cancelado"     # Fue cancelado
    PRESENTE     = "presente"      # El paciente asistió
    AUSENTE      = "ausente"
    REPROGRAMADO = "reprogramado"  # Inscripto en lista de espera tras reprogramar


class ConfiguracionGrilla(Base):
    """
    Guarda los parámetros con los que se generó una grilla mensual.
    Permite saber cómo fue configurada y regenerarla si es necesario.
    """
    __tablename__ = "configuracion_grilla"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mes              = Column(Integer, nullable=False)        # 1-12
    anio             = Column(Integer, nullable=False)        # ej: 2026
    hora_inicio      = Column(Time, nullable=False)           # ej: 08:00
    hora_fin         = Column(Time, nullable=False)           # ej: 18:00
    turnos_por_slot  = Column(Integer, nullable=False)        # cupos simultáneos por horario
    dias_habiles     = Column(String, nullable=False)         # "lunes,martes,miercoles,jueves,viernes"
    creado_por       = Column(UUID(as_uuid=True), nullable=False)  # id de la secretaria
    creado_en        = Column(DateTime, default=datetime.utcnow)

    turnos = relationship("Turno", back_populates="configuracion")


class Turno(Base):
    """
    Representa un cupo individual generado por la grilla.
    Cada fila es un slot de 40 minutos para UN paciente.
    """
    __tablename__ = "turnos"

    id                   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    configuracion_id     = Column(UUID(as_uuid=True), ForeignKey("configuracion_grilla.id"), nullable=True)
    fecha                = Column(Date, nullable=False)
    hora_inicio          = Column(Time, nullable=False)
    hora_fin             = Column(Time, nullable=False)       # hora_inicio + 40 min
    area_tratamiento = Column(SAEnum(AreaTratamiento, name="area_tratamiento", values_callable=lambda x: [e.value for e in x]), nullable=True)
    estado           = Column(SAEnum(EstadoTurno, name="estado_turno", values_callable=lambda x: [e.value for e in x]), nullable=False, default=EstadoTurno.DISPONIBLE)
    paciente_id          = Column(UUID(as_uuid=True), nullable=True)        # null si disponible
    profesional_id       = Column(UUID(as_uuid=True), nullable=True)        # se asigna al reservar
    creado_en            = Column(DateTime, default=datetime.utcnow)
    actualizado_en       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    nota_bloqueo         = Column(Text, nullable=True)        # motivo si está bloqueado
    lista_espera = relationship("ListaEspera", back_populates="turno")

    configuracion = relationship("ConfiguracionGrilla", back_populates="turnos")


class DiasCerrados(Base):
    """
    Fechas marcadas como feriado o cerradas por la secretaria.
    El generador de grilla las consulta para omitirlas.
    """
    __tablename__ = "dias_cerrados"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fecha           = Column(Date, nullable=False, unique=True)
    motivo          = Column(String, nullable=True)              # "Feriado nacional", "Mantenimiento", etc.
    creado_por      = Column(UUID(as_uuid=True), nullable=False)
    creado_en       = Column(DateTime, default=datetime.utcnow)
    horario_inicio  = Column(Time, nullable=True)   # si viene junto con horario_fin: día con horario reducido
    horario_fin     = Column(Time, nullable=True)

class ListaEspera(Base):
    __tablename__ = "lista_espera"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    turno_id    = Column(UUID(as_uuid=True), ForeignKey("turnos.id"), nullable=False)
    paciente_id = Column(UUID(as_uuid=True), nullable=False)
    area_tratamiento = Column(SAEnum(AreaTratamiento, name="area_tratamiento", values_callable=lambda x: [e.value for e in x]), nullable=False)  # ← agregar
    fecha_inscripcion = Column(DateTime, default=datetime.utcnow, nullable=False)
    activo      = Column(Boolean, default=True, nullable=False)

    turno = relationship("Turno", back_populates="lista_espera")