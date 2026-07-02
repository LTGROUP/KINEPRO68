from app.repositories.medical_records.medical_record_repository import (
    create_complementary_studies,
    create_medical_record_record,
    delete_complementary_studies_by_record_id,
    delete_medical_record_record,
    get_complementary_studies_by_record_id,
    get_medical_record_by_id,
    get_medical_record_by_patient_id,
    update_medical_record_record,
)
from app.services.audit import register_audit_log
from app.repositories.patients.patient_repository import get_patient_by_id
from app.schemas.medical_records.medical_record_schema import (
    ComplementaryStudyResponse,
    MedicalRecordCreateRequest,
    MedicalRecordResponse,
    MedicalRecordUpdateRequest,
)


def validate_professional_role(actor_role: str) -> None:
    if actor_role != "profesional":
        raise ValueError("Solo los profesionales pueden gestionar fichas médicas")


def clean_optional_text(value: str | None) -> str | None:
    if value is None:
        return None

    clean_value = value.strip()

    if not clean_value:
        return None

    return clean_value


def build_study_response(study: dict) -> ComplementaryStudyResponse:
    return ComplementaryStudyResponse(
        id=study["id"],
        ficha_medica_id=study["ficha_medica_id"],
        tipo_estudio=study["tipo_estudio"],
        fecha_estudio=study.get("fecha_estudio"),
        observaciones=study.get("observaciones"),
        archivo_url=study.get("archivo_url"),
        creado_en=study.get("creado_en"),
    )


def build_medical_record_response(record: dict, studies: list[dict]) -> MedicalRecordResponse:
    return MedicalRecordResponse(
        id=record["id"],
        paciente_id=record["paciente_id"],
        motivo_consulta=record.get("motivo_consulta"),
        diagnostico_medico=record.get("diagnostico_medico"),
        zona_afectada=record.get("zona_afectada"),
        fecha_inicio_lesion=record.get("fecha_inicio_lesion"),
        cirugias_relevantes=record.get("cirugias_relevantes"),
        enfermedades_relevantes=record.get("enfermedades_relevantes"),
        medicacion_actual=record.get("medicacion_actual"),
        alergias=record.get("alergias"),
        ocupacion=record.get("ocupacion"),
        actividad_fisica=record.get("actividad_fisica"),
        creada_en=record.get("creada_en"),
        actualizada_en=record.get("actualizada_en"),
        estudios=[build_study_response(study) for study in studies],
    )


def build_study_records(record_id: str, studies) -> list[dict]:
    records = []

    for study in studies:
        records.append(
            {
                "ficha_medica_id": record_id,
                "tipo_estudio": study.tipo_estudio,
                "fecha_estudio": study.fecha_estudio.isoformat() if study.fecha_estudio else None,
                "observaciones": study.observaciones,
                "archivo_url": study.archivo_url,
            }
        )

    return records


def build_existing_study_records(record_id: str, studies: list[dict]) -> list[dict]:
    records = []

    for study in studies:
        records.append(
            {
                "ficha_medica_id": record_id,
                "tipo_estudio": study["tipo_estudio"],
                "fecha_estudio": study.get("fecha_estudio"),
                "observaciones": study.get("observaciones"),
                "archivo_url": study.get("archivo_url"),
            }
        )

    return records


def create_medical_record(
    data: MedicalRecordCreateRequest,
    actor_role: str,
    actor_id: str,
    actor_dni: str | None = None,
) -> MedicalRecordResponse:
    actor_role = actor_role.strip().lower()
    validate_professional_role(actor_role)

    patient = get_patient_by_id(data.paciente_id)

    if not patient:
        raise ValueError("El paciente indicado no existe")

    if not patient.get("activo", True):
        raise ValueError("No se puede crear una ficha para un paciente inactivo")

    existing_record = get_medical_record_by_patient_id(data.paciente_id)

    if existing_record:
        raise ValueError("El paciente ya tiene una ficha médica cargada")

    record = create_medical_record_record(
        {
            "paciente_id": data.paciente_id,
            "motivo_consulta": clean_optional_text(data.motivo_consulta),
            "diagnostico_medico": clean_optional_text(data.diagnostico_medico),
            "zona_afectada": clean_optional_text(data.zona_afectada),
            "fecha_inicio_lesion": clean_optional_text(data.fecha_inicio_lesion),
            "cirugias_relevantes": clean_optional_text(data.cirugias_relevantes),
            "enfermedades_relevantes": clean_optional_text(data.enfermedades_relevantes),
            "medicacion_actual": clean_optional_text(data.medicacion_actual),
            "alergias": clean_optional_text(data.alergias),
            "ocupacion": clean_optional_text(data.ocupacion),
            "actividad_fisica": clean_optional_text(data.actividad_fisica),
        }
    )

    try:
        study_records = build_study_records(record["id"], data.estudios)
        studies = create_complementary_studies(study_records)
    except Exception:
        delete_medical_record_record(record["id"])
        raise

    register_audit_log(
        actor_id=actor_id,
        actor_role=actor_role,
        action="CREATE_MEDICAL_RECORD",
        entity_type="medical_record",
        entity_id=record["id"],
        entity_role="paciente",
        description=f"Creó la ficha médica de {patient['nombre']} {patient['apellido']}",
        actor_dni=actor_dni,
        metadata={"target_dni": patient["dni"]},
    )

    return build_medical_record_response(record, studies)


def get_medical_record_by_patient(
    patient_id: str,
    actor_role: str,
) -> MedicalRecordResponse:
    actor_role = actor_role.strip().lower()
    validate_professional_role(actor_role)

    record = get_medical_record_by_patient_id(patient_id)

    if not record:
        raise ValueError("El paciente no tiene una ficha médica cargada")

    studies = get_complementary_studies_by_record_id(record["id"])

    return build_medical_record_response(record, studies)


def update_medical_record(
    record_id: str,
    data: MedicalRecordUpdateRequest,
    actor_role: str,
    actor_id: str,
    actor_dni: str | None = None,
) -> MedicalRecordResponse:
    actor_role = actor_role.strip().lower()
    validate_professional_role(actor_role)

    existing_record = get_medical_record_by_id(record_id)

    if not existing_record:
        raise ValueError("La ficha médica indicada no existe")

    previous_record_data = {
        "motivo_consulta": existing_record.get("motivo_consulta"),
        "diagnostico_medico": existing_record.get("diagnostico_medico"),
        "zona_afectada": existing_record.get("zona_afectada"),
        "fecha_inicio_lesion": existing_record.get("fecha_inicio_lesion"),
        "cirugias_relevantes": existing_record.get("cirugias_relevantes"),
        "enfermedades_relevantes": existing_record.get("enfermedades_relevantes"),
        "medicacion_actual": existing_record.get("medicacion_actual"),
        "alergias": existing_record.get("alergias"),
        "ocupacion": existing_record.get("ocupacion"),
        "actividad_fisica": existing_record.get("actividad_fisica"),
    }
    previous_studies = get_complementary_studies_by_record_id(record_id)

    record = update_medical_record_record(
        record_id,
        {
            "motivo_consulta": clean_optional_text(data.motivo_consulta),
            "diagnostico_medico": clean_optional_text(data.diagnostico_medico),
            "zona_afectada": clean_optional_text(data.zona_afectada),
            "fecha_inicio_lesion": clean_optional_text(data.fecha_inicio_lesion),
            "cirugias_relevantes": clean_optional_text(data.cirugias_relevantes),
            "enfermedades_relevantes": clean_optional_text(data.enfermedades_relevantes),
            "medicacion_actual": clean_optional_text(data.medicacion_actual),
            "alergias": clean_optional_text(data.alergias),
            "ocupacion": clean_optional_text(data.ocupacion),
            "actividad_fisica": clean_optional_text(data.actividad_fisica),
        },
    )

    try:
        delete_complementary_studies_by_record_id(record_id)
        study_records = build_study_records(record_id, data.estudios)
        studies = create_complementary_studies(study_records)
    except Exception:
        update_medical_record_record(record_id, previous_record_data)
        delete_complementary_studies_by_record_id(record_id)

        if previous_studies:
            previous_records = build_existing_study_records(
                record_id,
                previous_studies,
            )
            create_complementary_studies(previous_records)

        raise

    patient = get_patient_by_id(existing_record["paciente_id"])
    register_audit_log(
        actor_id=actor_id,
        actor_role=actor_role,
        action="UPDATE_MEDICAL_RECORD",
        entity_type="medical_record",
        entity_id=record_id,
        entity_role="paciente",
        description="Actualizó una ficha médica",
        actor_dni=actor_dni,
        metadata={"target_dni": patient["dni"] if patient else None},
    )

    return build_medical_record_response(record, studies)
