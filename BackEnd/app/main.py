from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes.admin.admin_router import router as admin_router
from app.api.v1.routes.audit.audit_routes import router as audit_router
from app.api.v1.routes.auth.auth_routes import router as auth_router
from app.api.v1.routes.check_in.check_in_routes import router as check_in_router
from app.api.v1.routes.exercise_catalog.exercise_catalog_routes import (
    router as exercise_catalog_router,
)
from app.api.v1.routes.medical_records.medical_record_routes import (
    router as medical_records_router,
)
from app.api.v1.routes.patients.patient_routes import router as patients_router
from app.api.v1.routes.profesional.agenda_router import router as profesional_router
from app.api.v1.routes.routines.routine_routes import router as routines_router
from app.api.v1.routes.session_notes.session_note_routes import (
    router as session_notes_router,
)
from app.api.v1.routes.shifts import grilla_router as grilla
from app.api.v1.routes.shifts import turnos_router as turnos
from app.api.v1.routes.staff_management.staff_routes import router as staff_router
from app.config import settings

app = FastAPI(
    title="KinePro API",
    version="1.0.0",
    description="Backend del sistema de gestión kinesiológica KinePro",
)


def get_cors_origins() -> list[str]:
    origins = []
    for origin in settings.cors_allowed_origins.split(","):
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
    expose_headers=["Content-Disposition"],
)


@app.get("/")
async def root():
    return {"status": "KinePro API corriendo"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(grilla.router, prefix="/api/v1")
app.include_router(turnos.router, prefix="/api/v1")
app.include_router(routines_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(check_in_router, prefix="/api/v1")
app.include_router(exercise_catalog_router, prefix="/api/v1")
app.include_router(patients_router, prefix="/api/v1")
app.include_router(staff_router, prefix="/api/v1")
app.include_router(medical_records_router, prefix="/api/v1")
app.include_router(session_notes_router, prefix="/api/v1")
app.include_router(profesional_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
