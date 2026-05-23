from app.repositories.auth import login_with_dni
from app.schemas.auth.login_schema import LoginRequest, LoginResponse


def login_user(data: LoginRequest) -> LoginResponse:
    user = login_with_dni(data.dni, data.password)

    if not user:
        # No aclaramos si fallo el DNI o la contrasena por seguridad.
        raise ValueError("El DNI o la contrasena son incorrectos")

    if not user["activo"]:
        raise ValueError("La cuenta se encuentra inactiva")

    return LoginResponse(
        message="Inicio de sesion exitoso",
        user_id=user["id"],
        access_token=user["access_token"],
        nombre=user["nombre"],
        apellido=user["apellido"],
        dni=user["dni"],
        rol=user["rol"],
    )
