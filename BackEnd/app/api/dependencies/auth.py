from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.integrations.supabase.client import get_supabase_admin_client


AuthorizationHeader = Annotated[str | None, Header(alias="Authorization")]


ADMIN_ROLE = "administrativo"
SECRETARY_ROLE = "secretaria"
PATIENT_ROLE = "paciente"
PROFESSIONAL_ROLE = "profesional"


def get_current_profile(authorization: AuthorizationHeader = None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se encontro una sesion activa",
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        user_response = get_supabase_admin_client().auth.get_user(token)
        user_id = user_response.user.id
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesion no es valida",
        ) from error

    try:
        response = (
            get_supabase_admin_client()
            .table("profiles")
            .select("*")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Error de conexión con el servidor de autenticación",
        ) from error

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se encontro el perfil de la sesion",
        )

    profile = response.data[0]

    if not profile.get("activo", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta se encuentra inactiva",
        )

    return profile


def require_role(profile: dict, allowed_roles: list[str]) -> dict:
    user_role = profile.get("rol")

    for allowed_role in allowed_roles:
        if user_role == allowed_role:
            return profile

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No tenes permisos para realizar esta accion",
    )


def get_current_admin_profile(
    current_profile: dict = Depends(get_current_profile),
) -> dict:
    return require_role(current_profile, [ADMIN_ROLE])


def get_current_staff_manager_profile(
    current_profile: dict = Depends(get_current_profile),
) -> dict:
    return require_role(current_profile, [ADMIN_ROLE, SECRETARY_ROLE])


def get_current_patient_profile(
    current_profile: dict = Depends(get_current_profile),
) -> dict:
    return require_role(current_profile, [PATIENT_ROLE])


def get_current_professional_profile(
    current_profile: dict = Depends(get_current_profile),
) -> dict:
    return require_role(current_profile, [PROFESSIONAL_ROLE])
