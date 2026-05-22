from fastapi import APIRouter, HTTPException, status

from app.schemas.auth.login_schema import LoginRequest, LoginResponse
from app.schemas.auth.register_schema import RegisterRequest, RegisterResponse
from app.services.auth.login_service import login_user
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
