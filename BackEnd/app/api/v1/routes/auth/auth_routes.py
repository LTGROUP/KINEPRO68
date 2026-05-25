from fastapi import APIRouter, Depends, HTTPException, status
from app.api.dependencies.auth import get_current_profile

from app.schemas.auth.login_schema import LoginRequest, LoginResponse
from app.schemas.auth.register_schema import RegisterRequest, RegisterResponse
from app.services.auth.login_service import login_user
from app.services.auth.register_service import register_user
from app.schemas.auth.change_password_schema import ChangePasswordRequest, ChangePasswordResponse
from app.services.auth.change_password_service import change_password
from app.schemas.auth.forgot_password_schema import ForgotPasswordRequest, ForgotPasswordResponse
from app.schemas.auth.reset_password_schema import ResetPasswordRequest, ResetPasswordResponse
from app.services.auth.password_recovery_service import forgot_password, reset_password
from app.schemas.auth.profile_schema import ProfileResponse, ProfileUpdateRequest
from app.services.auth.profile_service import get_user_profile, update_user_profile


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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest) -> LoginResponse:
    try:
        return login_user(data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.post("/change-password", response_model=ChangePasswordResponse)
def change_user_password(
    request: ChangePasswordRequest,
    current_profile: dict = Depends(get_current_profile),
):
    try:
        result = change_password(
            current_profile["id"],
            request.current_password,
            request.new_password,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return ChangePasswordResponse(message=result["message"])
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password_endpoint(request: ForgotPasswordRequest):
    result = forgot_password(str(request.email))
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return ForgotPasswordResponse(message=result["message"])


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password_endpoint(request: ResetPasswordRequest):
    result = reset_password(request.token, request.new_password)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return ResetPasswordResponse(message=result["message"])


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_profile: dict = Depends(get_current_profile)):
    result = get_user_profile(current_profile["id"])
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return ProfileResponse(**result)


@router.patch("/me", response_model=ProfileResponse)
def update_my_profile(
    request: ProfileUpdateRequest,
    current_profile: dict = Depends(get_current_profile),
):
    result = update_user_profile(current_profile["id"], request)
    if "error" in result:
        if result["error"] == "Usuario no encontrado":
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(status_code=400, detail=result["error"])
    return ProfileResponse(**result)


# Compatibilidad temporal con clientes que aún llamen por POST.
@router.post("/me", response_model=ProfileResponse)
def get_my_profile_post(current_profile: dict = Depends(get_current_profile)):
    result = get_user_profile(current_profile["id"])
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return ProfileResponse(**result)
