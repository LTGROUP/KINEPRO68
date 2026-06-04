from app.integrations.email import send_account_created_email
from app.repositories.staff_management.staff_repository import (
    create_staff_profile,
    deactivate_staff_profile,
    get_staff_by_dni,
    get_staff_by_email,
    get_staff_by_id,
    get_professional_by_matricula,
    list_staff_profiles,
    update_staff_profile,
)
from app.schemas.staff_management.staff_schema import (
    ProfessionalDataResponse,
    StaffActionResponse,
    StaffCreateRequest,
    StaffListResponse,
    StaffResponse,
    StaffUpdateRequest,
)
from app.services.audit import register_audit_log


ALLOWED_TARGET_ROLES = {
    "administrativo": {"profesional", "secretaria", "administrativo"},
    "secretaria": {"profesional"},
}


def validate_actor_role(actor_role: str) -> None:
    if actor_role not in ALLOWED_TARGET_ROLES:
        raise ValueError("No tenes permisos para administrar personal")


def validate_target_role(actor_role: str, target_role: str, action: str) -> None:
    validate_actor_role(actor_role)

    if target_role not in ALLOWED_TARGET_ROLES[actor_role]:
        raise ValueError(f"No tenes permisos para {action} un usuario con rol {target_role}")


def validate_deactivate_permission(actor_role: str) -> None:
    if actor_role != "administrativo":
        raise ValueError("No tenes permisos para dar de baja personal")


def validate_unique_dni_email(
    dni: str | None,
    email: str | None,
    current_staff_id: str | None = None,
) -> None:
    if dni:
        existing_dni = get_staff_by_dni(dni)
        if existing_dni and existing_dni["id"] != current_staff_id:
            raise ValueError("El DNI ingresado ya pertenece a un usuario registrado")

    if email:
        existing_email = get_staff_by_email(str(email))
        if existing_email and existing_email["id"] != current_staff_id:
            raise ValueError("El email ingresado ya pertenece a un usuario registrado")


def validate_unique_matricula(data: StaffCreateRequest) -> None:
    if data.rol != "profesional":
        return

    if not data.matricula:
        return

    existing_professional = get_professional_by_matricula(data.matricula)

    if existing_professional:
        raise ValueError("La matricula ingresada ya pertenece a un profesional registrado")


def build_staff_response(staff: dict) -> StaffResponse:
    professional_response = None
    professional_data = staff.get("profesional")

    if professional_data:
        professional_response = ProfessionalDataResponse(
            matricula=professional_data.get("matricula"),
            especialidad=professional_data.get("especialidad"),
            area_tratamiento=professional_data.get("area_tratamiento"),
            horario_entrada=professional_data.get("horario_entrada"),
            horario_salida=professional_data.get("horario_salida"),
        )

    return StaffResponse(
        id=staff["id"],
        nombre=staff["nombre"],
        apellido=staff["apellido"],
        dni=staff["dni"],
        telefono=staff["telefono"],
        email=staff["email"],
        fecha_nacimiento=staff["fecha_nacimiento"],
        obra_social=staff["obra_social"],
        rol=staff["rol"],
        activo=staff["activo"],
        created_at=staff.get("created_at"),
        updated_at=staff.get("updated_at"),
        created_by=staff.get("created_by"),
        updated_by=staff.get("updated_by"),
        profesional=professional_response,
    )


def normalize_time_value(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()

    return value


def join_field_names(field_names: list[str]) -> str:
    text = ""

    for field_name in field_names:
        if text:
            text = text + ", "

        text = text + field_name

    return text


def build_professional_data_for_update(
    existing_staff: dict,
    data: StaffUpdateRequest,
    final_role: str,
) -> dict | None:
    if final_role != "profesional":
        return None

    existing_professional = existing_staff.get("profesional") or {}
    matricula = data.matricula or existing_professional.get("matricula")
    especialidad = data.especialidad or existing_professional.get("especialidad")
    area_tratamiento = data.area_tratamiento or existing_professional.get("area_tratamiento")
    horario_entrada = data.horario_entrada or existing_professional.get("horario_entrada")
    horario_salida = data.horario_salida or existing_professional.get("horario_salida")

    missing_fields = []
    if not matricula:
        missing_fields.append("matricula")
    if not especialidad:
        missing_fields.append("especialidad")
    if not area_tratamiento:
        missing_fields.append("area_tratamiento")
    if not horario_entrada:
        missing_fields.append("horario_entrada")
    if not horario_salida:
        missing_fields.append("horario_salida")

    if missing_fields:
        fields = join_field_names(missing_fields)
        raise ValueError(f"Faltan datos obligatorios del profesional: {fields}")

    if normalize_time_value(horario_salida) <= normalize_time_value(horario_entrada):
        raise ValueError("El horario de salida debe ser posterior al horario de entrada")

    return {
        "matricula": matricula,
        "especialidad": especialidad,
        "area_tratamiento": area_tratamiento,
        "horario_entrada": normalize_time_value(horario_entrada),
        "horario_salida": normalize_time_value(horario_salida),
    }


def create_staff(
    data: StaffCreateRequest,
    actor_role: str,
    actor_id: str,
    actor_dni: str | None = None,
) -> StaffResponse:
    actor_role = actor_role.strip().lower()
    validate_target_role(actor_role, data.rol, "crear")
    validate_unique_dni_email(data.dni, str(data.email))
    validate_unique_matricula(data)

    staff_id = create_staff_profile(data, actor_id)
    staff = get_staff_by_id(staff_id)

    if not staff:
        raise ValueError("No se pudo recuperar el personal creado")

    send_account_created_email(str(staff["email"]), staff["nombre"], staff["rol"])
    register_audit_log(
        actor_id=actor_id,
        actor_role=actor_role,
        action="CREATE_STAFF",
        entity_type="staff",
        entity_id=staff["id"],
        entity_role=staff["rol"],
        description=f"Registró a {staff['nombre']} {staff['apellido']} como {staff['rol']}",
        actor_dni=actor_dni,
        metadata={"target_dni": staff["dni"]},
    )

    return build_staff_response(staff)


def list_staff(
    actor_role: str,
    include_inactive: bool = False,
    rol: str | None = None,
) -> StaffListResponse:
    actor_role = actor_role.strip().lower()
    if rol:
        rol = rol.strip().lower()
    else:
        rol = None
    validate_actor_role(actor_role)

    if rol:
        validate_target_role(actor_role, rol, "listar")

    items = []
    staff_profiles = list_staff_profiles(include_inactive=include_inactive, rol=rol)

    for staff in staff_profiles:
        if staff["rol"] in ALLOWED_TARGET_ROLES[actor_role]:
            items.append(build_staff_response(staff))

    return StaffListResponse(items=items, total=len(items))


def get_staff_detail(staff_id: str, actor_role: str) -> StaffResponse:
    actor_role = actor_role.strip().lower()
    staff = get_staff_by_id(staff_id)

    if not staff:
        raise ValueError("El personal indicado no existe")

    validate_target_role(actor_role, staff["rol"], "consultar")
    return build_staff_response(staff)


def update_staff(
    staff_id: str,
    data: StaffUpdateRequest,
    actor_role: str,
    actor_id: str,
    actor_dni: str | None = None,
) -> StaffResponse:
    actor_role = actor_role.strip().lower()
    existing_staff = get_staff_by_id(staff_id)

    if not existing_staff:
        raise ValueError("El personal indicado no existe")

    validate_target_role(actor_role, existing_staff["rol"], "editar")
    final_role = data.rol or existing_staff["rol"]
    validate_target_role(actor_role, final_role, "asignar")
    email = None

    if data.email:
        email = str(data.email)

    validate_unique_dni_email(None, email, staff_id)

    professional_data = build_professional_data_for_update(existing_staff, data, final_role)
    update_staff_profile(staff_id, data, actor_id, professional_data)
    updated_staff = get_staff_by_id(staff_id)

    if not updated_staff:
        raise ValueError("No se pudo recuperar el personal actualizado")

    register_audit_log(
        actor_id=actor_id,
        actor_role=actor_role,
        action="UPDATE_STAFF",
        entity_type="staff",
        entity_id=updated_staff["id"],
        entity_role=updated_staff["rol"],
        description=f"Actualizó los datos de {updated_staff['nombre']} {updated_staff['apellido']}",
        actor_dni=actor_dni,
        metadata={"target_dni": updated_staff["dni"]},
    )

    return build_staff_response(updated_staff)


def deactivate_staff(
    staff_id: str,
    actor_role: str,
    actor_id: str,
    actor_dni: str | None = None,
) -> StaffActionResponse:
    actor_role = actor_role.strip().lower()

    if staff_id == actor_id:
        raise ValueError("No podes darte de baja a vos mismo")

    existing_staff = get_staff_by_id(staff_id)

    if not existing_staff:
        raise ValueError("El personal indicado no existe")

    validate_deactivate_permission(actor_role)
    validate_target_role(actor_role, existing_staff["rol"], "dar de baja")
    deactivate_staff_profile(staff_id, actor_id)
    register_audit_log(
        actor_id=actor_id,
        actor_role=actor_role,
        action="DELETE_STAFF",
        entity_type="staff",
        entity_id=staff_id,
        entity_role=existing_staff["rol"],
        description=f"Dio de baja a {existing_staff['nombre']} {existing_staff['apellido']}",
        actor_dni=actor_dni,
        metadata={"target_dni": existing_staff["dni"]},
    )

    return StaffActionResponse(
        message="Personal dado de baja correctamente",
        staff_id=staff_id,
    )
