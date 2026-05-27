from app.repositories.auth import login_with_dni, refresh_auth_session
from app.schemas.auth.login_schema import (
    LoginRequest,
    LoginResponse,
    RefreshSessionRequest,
    RefreshSessionResponse,
)


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
        refresh_token=user["refresh_token"],
        nombre=user["nombre"],
        apellido=user["apellido"],
        dni=user["dni"],
        rol=user["rol"],
    )


def refresh_user_session(data: RefreshSessionRequest) -> RefreshSessionResponse:
    user = refresh_auth_session(data.refresh_token)

    if not user:
        raise ValueError("La sesion no se pudo renovar")

    if not user["activo"]:
        raise ValueError("La cuenta se encuentra inactiva")

    return RefreshSessionResponse(
        message="Sesion renovada correctamente",
        user_id=user["id"],
        access_token=user["access_token"],
        refresh_token=user["refresh_token"],
        nombre=user["nombre"],
        apellido=user["apellido"],
        dni=user["dni"],
        rol=user["rol"],
    )
