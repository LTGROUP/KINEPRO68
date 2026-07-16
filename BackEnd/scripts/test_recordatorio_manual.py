"""
Envia un email de recordatorio de turno usando la funcion real de produccion
(app.integrations.email.email_service.send_recordatorio_turno), con datos de
turno hardcodeados. No toca la base de datos ni crea/modifica turnos.

Uso:
    venv/Scripts/python.exe scripts/test_recordatorio_manual.py
"""
import sys
from datetime import date, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.integrations.email.email_service import send_recordatorio_turno
from app.repositories.patients.patient_repository import get_patient_by_dni

DNI_PACIENTE = "9990999"
DESTINATARIO = "1caceres.santiago5@gmail.com"

FECHA_TURNO = date.today()
HORA_INICIO = time(18, 0)
HORA_FIN = time(18, 40)
AREA_TRATAMIENTO = "tren_superior"


def main() -> None:
    paciente = get_patient_by_dni(DNI_PACIENTE)
    if paciente:
        nombre_paciente = f"{paciente['nombre']} {paciente['apellido']}"
        print(f"Paciente encontrado en BD (DNI {DNI_PACIENTE}): {nombre_paciente}")
    else:
        nombre_paciente = "Paciente Test"
        print(f"DNI {DNI_PACIENTE} no encontrado en BD, uso valor de prueba: {nombre_paciente}")

    print(f"Enviando recordatorio a {DESTINATARIO} (turno de {nombre_paciente}, "
          f"{FECHA_TURNO} {HORA_INICIO}-{HORA_FIN}, area={AREA_TRATAMIENTO})...")

    enviado = send_recordatorio_turno(
        email=DESTINATARIO,
        fecha=FECHA_TURNO,
        hora_inicio=HORA_INICIO,
        hora_fin=HORA_FIN,
        area_tratamiento=AREA_TRATAMIENTO,
    )

    if enviado:
        print("RESULTADO: OK - el email se envio correctamente.")
    else:
        print("RESULTADO: ERROR - send_recordatorio_turno devolvio False. Revisar logs / SMTP config.")


if __name__ == "__main__":
    main()
