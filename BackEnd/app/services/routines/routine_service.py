from datetime import date

from app.repositories.exercise_catalog.exercise_catalog_repository import (
    get_catalog_exercises_by_ids,
)
from app.repositories.patients.patient_repository import get_patient_by_id
from app.repositories.routines.routine_repository import (
    create_routine_exercises,
    create_routine_record,
    deactivate_routine_record,
    deactivate_other_active_routines_by_patient,
    delete_routine_record,
    delete_exercises_by_routine_id,
    get_active_routines_by_patient,
    get_exercises_by_routine_id,
    get_routine_by_id,
    update_routine_record,
)
from app.services.audit import register_audit_log
from app.schemas.routines.routine_schema import (
    RoutineCreateRequest,
    RoutineExerciseResponse,
    RoutineListResponse,
    RoutineResponse,
    RoutineUpdateRequest,
)


def validate_professional_role(actor_role: str) -> None:
    if actor_role != "profesional":
        raise ValueError("Solo los profesionales pueden gestionar rutinas")


def validate_dates(
    fecha_inicio: date,
    fecha_fin: date,
    allow_past_start: bool = False,
) -> None:
    if not allow_past_start and fecha_inicio < date.today():
        raise ValueError("La fecha de inicio no puede ser anterior al día de hoy")

    if fecha_fin < fecha_inicio:
        raise ValueError("La fecha de finalización debe ser posterior o igual a la fecha de inicio")


def get_frequency_day_count(frequency: str) -> int:
    day_counts = {
        "1 vez por semana": 1,
        "2 veces por semana": 2,
        "3 veces por semana": 3,
        "4 veces por semana": 4,
        "Diaria": 5,
    }

    if frequency not in day_counts:
        raise ValueError("La frecuencia seleccionada no es válida")

    return day_counts[frequency]


def validate_exercise_days(frequency: str, exercises) -> None:
    allowed_day_count = get_frequency_day_count(frequency)
    blocks_by_day = {}
    exercise_orders = set()

    for exercise in exercises:
        if exercise.dia > allowed_day_count:
            raise ValueError(
                "Los días de los ejercicios no coinciden con la frecuencia seleccionada"
            )

        if exercise.dia not in blocks_by_day:
            blocks_by_day[exercise.dia] = set()

        blocks_by_day[exercise.dia].add(exercise.bloque_orden)

        if exercise.orden in exercise_orders:
            raise ValueError("El orden de los ejercicios no puede repetirse")

        exercise_orders.add(exercise.orden)

    for blocks in blocks_by_day.values():
        sorted_blocks = sorted(blocks)
        expected_blocks = list(range(1, len(sorted_blocks) + 1))

        if sorted_blocks != expected_blocks:
            raise ValueError("Los bloques de cada día deben estar numerados sin saltos")

    if blocks_by_day:
        highest_day = max(blocks_by_day)
        expected_days = set(range(1, highest_day + 1))

        if set(blocks_by_day) != expected_days:
            raise ValueError("Todos los días creados deben tener al menos un ejercicio")


def validate_catalog_exercises(
    exercises,
    historical_catalog_snapshots: dict[str, set[tuple[str, str, str]]] | None = None,
) -> None:
    if historical_catalog_snapshots is None:
        historical_catalog_snapshots = {}

    catalog_ids = []

    for exercise in exercises:
        if exercise.ejercicio_catalogo_id:
            catalog_ids.append(exercise.ejercicio_catalogo_id)

    catalog_rows = get_catalog_exercises_by_ids(list(set(catalog_ids)))
    catalog_by_id = {}

    for row in catalog_rows:
        catalog_by_id[row["id"]] = row

    for exercise in exercises:
        if not exercise.ejercicio_catalogo_id:
            continue

        historical_values = historical_catalog_snapshots.get(
            exercise.ejercicio_catalogo_id,
            set(),
        )
        submitted_values = (
            exercise.nombre,
            exercise.area_tratamiento,
            exercise.zona_muscular,
        )

        if submitted_values in historical_values:
            continue

        catalog_exercise = catalog_by_id.get(exercise.ejercicio_catalogo_id)

        if not catalog_exercise or not catalog_exercise.get("activo", False):
            raise ValueError("Uno de los ejercicios seleccionados ya no está disponible")

        if (
            exercise.nombre != catalog_exercise["nombre"]
            or exercise.area_tratamiento != catalog_exercise["area_tratamiento"]
            or exercise.zona_muscular != catalog_exercise["zona_muscular"]
        ):
            raise ValueError("Los datos del ejercicio no coinciden con el catálogo")


def build_exercise_records(routine_id: str, exercises) -> list[dict]:
    records = []

    for exercise in exercises:
        if isinstance(exercise, dict):
            exercise_data = exercise
        else:
            exercise_data = exercise.model_dump()

        records.append(
            {
                "rutina_id": routine_id,
                "nombre": exercise_data.get("nombre"),
                "ejercicio_catalogo_id": exercise_data.get("ejercicio_catalogo_id"),
                "area_tratamiento": exercise_data.get("area_tratamiento"),
                "zona_muscular": exercise_data.get("zona_muscular"),
                "series": exercise_data.get("series"),
                "repeticiones": exercise_data.get("repeticiones"),
                "descanso": exercise_data.get("descanso"),
                "observaciones": exercise_data.get("observaciones"),
                "orden": exercise_data.get("orden"),
                "dia": exercise_data.get("dia", 1),
                "bloque_orden": exercise_data.get("bloque_orden", 1),
            }
        )

    return records


def build_exercise_response(exercise: dict) -> RoutineExerciseResponse:
    return RoutineExerciseResponse(
        id=exercise["id"],
        rutina_id=exercise["rutina_id"],
        nombre=exercise["nombre"],
        ejercicio_catalogo_id=exercise.get("ejercicio_catalogo_id"),
        area_tratamiento=exercise.get("area_tratamiento"),
        zona_muscular=exercise.get("zona_muscular"),
        series=exercise["series"],
        repeticiones=exercise["repeticiones"],
        descanso=exercise.get("descanso"),
        observaciones=exercise.get("observaciones"),
        orden=exercise["orden"],
        dia=exercise.get("dia", 1),
        bloque_orden=exercise.get("bloque_orden", 1),
    )


def build_routine_response(routine: dict, exercises: list[dict]) -> RoutineResponse:
    return RoutineResponse(
        id=routine["id"],
        paciente_id=routine["paciente_id"],
        profesional_id=routine["profesional_id"],
        titulo=routine["titulo"],
        frecuencia=routine.get("frecuencia"),
        fecha_inicio=routine.get("fecha_inicio"),
        fecha_fin=routine.get("fecha_fin"),
        indicaciones_generales=routine.get("indicaciones_generales"),
        activa=routine["activa"],
        creada_en=routine.get("creada_en"),
        actualizada_en=routine.get("actualizada_en"),
        ejercicios=[build_exercise_response(exercise) for exercise in exercises],
    )


def create_routine(
    data: RoutineCreateRequest,
    actor_role: str,
    actor_id: str,
    actor_dni: str | None = None,
) -> RoutineResponse:
    actor_role = actor_role.strip().lower()
    validate_professional_role(actor_role)
    validate_dates(data.fecha_inicio, data.fecha_fin)
    validate_exercise_days(data.frecuencia, data.ejercicios)
    validate_catalog_exercises(data.ejercicios)

    patient = get_patient_by_id(data.paciente_id)

    if not patient:
        raise ValueError("El paciente indicado no existe")

    if not patient.get("activo", True):
        raise ValueError("No se puede asignar una rutina a un paciente inactivo")

    routine = create_routine_record(
        {
            "paciente_id": data.paciente_id,
            "profesional_id": actor_id,
            "titulo": data.titulo,
            "frecuencia": data.frecuencia,
            "fecha_inicio": data.fecha_inicio.isoformat(),
            "fecha_fin": data.fecha_fin.isoformat(),
            "indicaciones_generales": data.indicaciones_generales,
            "activa": True,
        }
    )

    try:
        exercise_records = build_exercise_records(routine["id"], data.ejercicios)
        exercises = create_routine_exercises(exercise_records)
    except Exception:
        delete_routine_record(routine["id"])
        raise

    try:
        deactivate_other_active_routines_by_patient(
            patient_id=data.paciente_id,
            active_routine_id=routine["id"],
        )
    except Exception:
        delete_exercises_by_routine_id(routine["id"])
        delete_routine_record(routine["id"])
        raise

    register_audit_log(
        actor_id=actor_id,
        actor_role=actor_role,
        action="CREATE_ROUTINE",
        entity_type="routine",
        entity_id=routine["id"],
        entity_role="paciente",
        description=f"Asignó una rutina al paciente {patient['nombre']} {patient['apellido']}",
        actor_dni=actor_dni,
        metadata={"target_dni": patient["dni"]},
    )

    return build_routine_response(routine, exercises)


def list_active_routines_by_patient(
    patient_id: str,
    actor_role: str,
) -> RoutineListResponse:
    actor_role = actor_role.strip().lower()
    validate_professional_role(actor_role)

    routines = get_active_routines_by_patient(patient_id)
    items = []

    for routine in routines:
        exercises = get_exercises_by_routine_id(routine["id"])
        items.append(build_routine_response(routine, exercises))

    return RoutineListResponse(items=items, total=len(items))


def get_active_routine_by_patient(
    patient_id: str,
    actor_role: str,
) -> RoutineResponse:
    actor_role = actor_role.strip().lower()
    validate_professional_role(actor_role)

    routines = get_active_routines_by_patient(patient_id)

    if not routines:
        raise ValueError("El paciente no posee una rutina activa")

    routine = routines[0]
    exercises = get_exercises_by_routine_id(routine["id"])

    return build_routine_response(routine, exercises)


def get_own_active_routine(
    patient_id: str,
    actor_role: str,
) -> RoutineResponse:
    clean_actor_role = actor_role.strip().lower()

    if clean_actor_role != "paciente":
        raise ValueError("Solo los pacientes pueden consultar su propia rutina")

    routines = get_active_routines_by_patient(patient_id)

    if not routines:
        raise ValueError("Todavía no tenés una rutina activa")

    routine = routines[0]
    exercises = get_exercises_by_routine_id(routine["id"])

    return build_routine_response(routine, exercises)


def update_routine(
    routine_id: str,
    data: RoutineUpdateRequest,
    actor_role: str,
    actor_id: str,
    actor_dni: str | None = None,
) -> RoutineResponse:
    actor_role = actor_role.strip().lower()
    validate_professional_role(actor_role)
    validate_dates(data.fecha_inicio, data.fecha_fin, allow_past_start=True)
    validate_exercise_days(data.frecuencia, data.ejercicios)

    existing_routine = get_routine_by_id(routine_id)

    if not existing_routine:
        raise ValueError("La rutina indicada no existe")

    previous_exercises = get_exercises_by_routine_id(routine_id)
    historical_catalog_snapshots = {}

    for exercise in previous_exercises:
        catalog_id = exercise.get("ejercicio_catalogo_id")

        if catalog_id:
            if catalog_id not in historical_catalog_snapshots:
                historical_catalog_snapshots[catalog_id] = set()

            historical_catalog_snapshots[catalog_id].add(
                (
                    exercise.get("nombre"),
                    exercise.get("area_tratamiento"),
                    exercise.get("zona_muscular"),
                )
            )

    validate_catalog_exercises(
        data.ejercicios,
        historical_catalog_snapshots=historical_catalog_snapshots,
    )
    previous_routine_data = {
        "titulo": existing_routine["titulo"],
        "frecuencia": existing_routine.get("frecuencia"),
        "fecha_inicio": existing_routine.get("fecha_inicio"),
        "fecha_fin": existing_routine.get("fecha_fin"),
        "indicaciones_generales": existing_routine.get("indicaciones_generales"),
    }

    updated_routine = update_routine_record(
        routine_id,
        {
            "titulo": data.titulo,
            "frecuencia": data.frecuencia,
            "fecha_inicio": data.fecha_inicio.isoformat(),
            "fecha_fin": data.fecha_fin.isoformat(),
            "indicaciones_generales": data.indicaciones_generales,
        },
    )

    try:
        delete_exercises_by_routine_id(routine_id)
        exercise_records = build_exercise_records(routine_id, data.ejercicios)
        exercises = create_routine_exercises(exercise_records)
    except Exception:
        update_routine_record(routine_id, previous_routine_data)
        delete_exercises_by_routine_id(routine_id)

        if previous_exercises:
            previous_records = build_exercise_records(routine_id, previous_exercises)
            create_routine_exercises(previous_records)

        raise

    patient = get_patient_by_id(existing_routine["paciente_id"])
    register_audit_log(
        actor_id=actor_id,
        actor_role=actor_role,
        action="UPDATE_ROUTINE",
        entity_type="routine",
        entity_id=routine_id,
        entity_role="paciente",
        description="Actualizó una rutina de ejercicios",
        actor_dni=actor_dni,
        metadata={"target_dni": patient["dni"] if patient else None},
    )

    return build_routine_response(updated_routine, exercises)


def deactivate_routine(
    routine_id: str,
    actor_role: str,
    actor_id: str,
    actor_dni: str | None = None,
) -> RoutineResponse:
    actor_role = actor_role.strip().lower()
    validate_professional_role(actor_role)

    existing_routine = get_routine_by_id(routine_id)

    if not existing_routine:
        raise ValueError("La rutina indicada no existe")

    if existing_routine["profesional_id"] != actor_id:
        raise ValueError("No tenes permisos para eliminar esta rutina")

    routine = deactivate_routine_record(routine_id)
    exercises = get_exercises_by_routine_id(routine_id)

    patient = get_patient_by_id(existing_routine["paciente_id"])
    register_audit_log(
        actor_id=actor_id,
        actor_role=actor_role,
        action="DELETE_ROUTINE",
        entity_type="routine",
        entity_id=routine_id,
        entity_role="paciente",
        description="Eliminó una rutina de ejercicios",
        actor_dni=actor_dni,
        metadata={"target_dni": patient["dni"] if patient else None},
    )

    return build_routine_response(routine, exercises)
