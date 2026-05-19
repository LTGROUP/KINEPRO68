from app.db.local.user_repository import get_user_by_dni, verify_password_for_local_db
from app.schemas.auth.login_schema import LoginRequest, LoginResponse


def login_user(data: LoginRequest) -> LoginResponse:
    user = get_user_by_dni(data.dni)

    if not user:
        # No aclaramos si fallo el DNI o la contrasena por seguridad.
        raise ValueError("El DNI o la contrasena son incorrectos")

    if not user["activo"]:
        raise ValueError("La cuenta se encuentra inactiva")

    if not verify_password_for_local_db(data.password, user["password"]):
        # Mismo mensaje generico para no revelar si el usuario existe.
        raise ValueError("El DNI o la contrasena son incorrectos")

    return LoginResponse(
        message="Inicio de sesion exitoso",
        user_id=user["id"],
        nombre=user["nombre"],
        apellido=user["apellido"],
        dni=user["dni"],
        rol=user["rol"],
    )
