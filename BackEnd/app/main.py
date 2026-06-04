import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes.audit.audit_routes import router as audit_router
from app.api.v1.routes.auth.auth_routes import router as auth_router
from app.api.v1.routes.check_in.check_in_routes import router as check_in_router
from app.api.v1.routes.patients.patient_routes import router as patients_router
from app.api.v1.routes.staff_management.staff_routes import router as staff_router


app = FastAPI(title="KinePro API")


def get_cors_origins() -> list[str]:
    configured_origins = os.getenv("CORS_ALLOWED_ORIGINS")

    if not configured_origins:
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]

    origins = []
    for origin in configured_origins.split(","):
        clean_origin = origin.strip()
        if clean_origin:
            origins.append(clean_origin)

    return origins


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(audit_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(check_in_router, prefix="/api/v1")
app.include_router(patients_router, prefix="/api/v1")
app.include_router(staff_router, prefix="/api/v1")
