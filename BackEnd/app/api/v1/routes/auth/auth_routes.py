from fastapi import APIRouter, HTTPException, status

from app.schemas.auth.login_schema import (
    LoginRequest,
    LoginResponse,
    RefreshSessionRequest,
    RefreshSessionResponse,
)
from app.schemas.auth.register_schema import RegisterRequest, RegisterResponse
from app.services.auth.login_service import login_user, refresh_user_session
from app.services.auth.register_service import register_user


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(data: RegisterRequest) -> RegisterResponse:
    try:
        return register_user(data)
    except ValueError as error:
        # Los ValueError del service son errores esperados del usuario, no fallas del servidor.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest) -> LoginResponse:
    try:
        return login_user(data)
    except ValueError as error:
        # Convertimos errores de negocio en respuestas HTTP que el front pueda mostrar.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.post("/refresh", response_model=RefreshSessionResponse)
def refresh_session(data: RefreshSessionRequest) -> RefreshSessionResponse:
    try:
        return refresh_user_session(data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(error),
        ) from error
