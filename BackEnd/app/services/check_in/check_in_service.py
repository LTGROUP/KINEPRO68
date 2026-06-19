from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.repositories.check_in import (
    get_present_turn_for_today,
    list_reserved_turns_for_today,
    mark_turn_as_present,
)
from app.schemas.check_in import CheckInRequest, CheckInResponse


CHECK_IN_QR_VALUE = "kinepro://checkin/clinica-principal"
CLINIC_TIMEZONE = ZoneInfo("America/Argentina/Buenos_Aires")
TURN_EXPIRATION_HOURS = 3


def get_turn_start_datetime(turn: dict) -> datetime:
    turn_date = datetime.fromisoformat(turn["fecha"]).date()
    turn_start_time = time.fromisoformat(turn["hora_inicio"])
    return datetime.combine(turn_date, turn_start_time, tzinfo=CLINIC_TIMEZONE)


def turn_is_expired(turn: dict) -> bool:
    now = datetime.now(CLINIC_TIMEZONE)
    turn_start = get_turn_start_datetime(turn)
    turn_expiration = turn_start + timedelta(hours=TURN_EXPIRATION_HOURS)
    return now > turn_expiration


def find_available_reserved_turn(turns: list[dict]) -> dict | None:
    for turn in turns:
        if not turn_is_expired(turn):
            return turn

    return None


def register_check_in(data: CheckInRequest, current_profile: dict) -> CheckInResponse:
    qr_value = data.qr_value.strip()

    if qr_value != CHECK_IN_QR_VALUE:
        raise ValueError("El QR escaneado no pertenece a KinePro")

    patient_id = current_profile["id"]

    reserved_turns = list_reserved_turns_for_today(patient_id)
    reserved_turn = find_available_reserved_turn(reserved_turns)

    if not reserved_turn:
        present_turn = get_present_turn_for_today(patient_id)

        if present_turn:
            raise ValueError("La asistencia para el turno de hoy ya fue registrada")

        if reserved_turns:
            raise ValueError("Ya no tenés turnos disponibles para registrar asistencia en el día de hoy")

        raise ValueError("No tenés un turno reservado para hoy")

    updated_turn = mark_turn_as_present(reserved_turn["id"])
    if not updated_turn:
        raise ValueError("No se pudo actualizar el estado del turno")

    return CheckInResponse(
        message="Asistencia registrada correctamente",
        turno_id=reserved_turn["id"],
        estado="presente",
    )
