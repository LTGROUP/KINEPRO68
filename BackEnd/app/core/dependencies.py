# app/core/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings

security = HTTPBearer()

def decode_supabase_token(token: str) -> dict:
    """
    Supabase firma sus JWT con el JWT_SECRET del proyecto.
    Lo encontrás en: Supabase → Settings → API → JWT Secret
    """
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Cualquier usuario autenticado."""
    payload = decode_supabase_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sin usuario",
        )
    return {"id": user_id, "rol": payload.get("user_metadata", {}).get("rol")}

async def get_current_secretaria(
    current_user=Depends(get_current_user)
):
    """Solo secretarias. Lanza 403 si el rol no coincide."""
    if current_user["rol"] not in ("secretaria", "administrador"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo las secretarias pueden realizar esta acción",
        )
    return current_user