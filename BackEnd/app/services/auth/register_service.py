from app.integrations.email import send_account_created_email
from app.repositories.auth import create_auth_user, get_profile_by_dni, get_profile_by_email
from app.schemas.auth.register_schema import RegisterRequest, RegisterResponse


def register_user(data: RegisterRequest) -> RegisterResponse:
    # Validamos duplicados antes de crear el perfil para dar mensajes claros.
    existing_user = get_profile_by_dni(data.dni)

    if existing_user:
        raise ValueError("El DNI ingresado ya pertenece a un usuario registrado")

    existing_email = get_profile_by_email(str(data.email))

    if existing_email:
        raise ValueError("El email ingresado ya pertenece a un usuario registrado")

    user_id = create_auth_user(data)
    send_account_created_email(str(data.email), data.nombre, "paciente")

    return RegisterResponse(
        message="Cuenta creada con exito",
        user_id=user_id,
        rol="paciente",
    )
