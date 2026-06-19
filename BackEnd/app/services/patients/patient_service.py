from app.integrations.email import send_account_created_email
from app.repositories.patients.patient_repository import (
    create_patient_profile,
    get_patient_by_dni,
    get_patient_by_email,
    get_patient_by_id,
    list_patient_profiles,
    update_patient_profile,
)
from app.schemas.patients.patient_schema import (
    PatientCreateRequest,
    PatientListResponse,
    PatientResponse,
    PatientUpdateRequest,
)
from app.services.audit import register_audit_log


ALLOWED_PATIENT_MANAGERS = {"administrativo", "secretaria"}
ALLOWED_PATIENT_READERS = {"administrativo", "secretaria", "profesional"}


def validate_patient_reader_role(actor_role: str) -> None:
    if actor_role not in ALLOWED_PATIENT_READERS:
        raise ValueError("No tenes permisos para consultar pacientes")


def validate_actor_role(actor_role: str) -> None:
    if actor_role not in ALLOWED_PATIENT_MANAGERS:
        raise ValueError("No tenes permisos para administrar pacientes")


def validate_unique_dni_email(
    dni: str | None,
    email: str | None,
    current_patient_id: str | None = None,
) -> None:
    if dni:
        existing_dni = get_patient_by_dni(dni)
        if existing_dni and existing_dni["id"] != current_patient_id:
            raise ValueError("El DNI ingresado ya pertenece a un usuario registrado")

    if email:
        existing_email = get_patient_by_email(str(email))
        if existing_email and existing_email["id"] != current_patient_id:
            raise ValueError("El email ingresado ya pertenece a un usuario registrado")


def build_patient_response(patient: dict) -> PatientResponse:
    return PatientResponse(
        id=patient["id"],
        nombre=patient["nombre"],
        apellido=patient["apellido"],
        dni=patient["dni"],
        telefono=patient["telefono"],
        email=patient["email"],
        fecha_nacimiento=patient["fecha_nacimiento"],
        obra_social=patient["obra_social"],
        rol=patient["rol"],
        activo=patient["activo"],
        created_at=patient.get("created_at"),
        updated_at=patient.get("updated_at"),
        created_by=patient.get("created_by"),
        updated_by=patient.get("updated_by"),
    )


def create_patient(
    data: PatientCreateRequest,
    actor_role: str,
    actor_id: str,
    actor_dni: str | None = None,
) -> PatientResponse:
    actor_role = actor_role.strip().lower()
    validate_actor_role(actor_role)
    validate_unique_dni_email(data.dni, str(data.email))

    patient_id = create_patient_profile(data, actor_id)
    patient = get_patient_by_id(patient_id)

    if not patient:
        raise ValueError("No se pudo recuperar el paciente creado")

    send_account_created_email(str(patient["email"]), patient["nombre"], patient["rol"])
    register_audit_log(
        actor_id=actor_id,
        actor_role=actor_role,
        action="CREATE_PATIENT",
        entity_type="patient",
        entity_id=patient["id"],
        entity_role=patient["rol"],
        description=f"Registró al paciente {patient['nombre']} {patient['apellido']}",
        actor_dni=actor_dni,
        metadata={"target_dni": patient["dni"]},
    )

    return build_patient_response(patient)


def list_patients(
    actor_role: str,
    include_inactive: bool = False,
) -> PatientListResponse:
    actor_role = actor_role.strip().lower()
    validate_patient_reader_role(actor_role)

    items = []
    patient_profiles = list_patient_profiles(include_inactive=include_inactive)

    for patient in patient_profiles:
        items.append(build_patient_response(patient))

    return PatientListResponse(items=items, total=len(items))


def get_patient_detail(patient_id: str, actor_role: str) -> PatientResponse:
    actor_role = actor_role.strip().lower()
    validate_patient_reader_role(actor_role)

    patient = get_patient_by_id(patient_id)

    if not patient:
        raise ValueError("El paciente indicado no existe")

    return build_patient_response(patient)


def update_patient(
    patient_id: str,
    data: PatientUpdateRequest,
    actor_role: str,
    actor_id: str,
    actor_dni: str | None = None,
) -> PatientResponse:
    actor_role = actor_role.strip().lower()
    validate_actor_role(actor_role)
    existing_patient = get_patient_by_id(patient_id)

    if not existing_patient:
        raise ValueError("El paciente indicado no existe")

    email = None

    if data.email:
        email = str(data.email)

    validate_unique_dni_email(None, email, patient_id)
    update_patient_profile(patient_id, data, actor_id)
    updated_patient = get_patient_by_id(patient_id)

    if not updated_patient:
        raise ValueError("No se pudo recuperar el paciente actualizado")

    register_audit_log(
        actor_id=actor_id,
        actor_role=actor_role,
        action="UPDATE_PATIENT",
        entity_type="patient",
        entity_id=updated_patient["id"],
        entity_role=updated_patient["rol"],
        description=f"Actualizó los datos del paciente {updated_patient['nombre']} {updated_patient['apellido']}",
        actor_dni=actor_dni,
        metadata={"target_dni": updated_patient["dni"]},
    )

    return build_patient_response(updated_patient)
