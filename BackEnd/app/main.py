from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes.audit.audit_routes import router as audit_router
from app.api.v1.routes.auth.auth_routes import router as auth_router
from app.api.v1.routes.patients.patient_routes import router as patients_router
from app.api.v1.routes.staff_management.staff_routes import router as staff_router


app = FastAPI(title="KinePro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(audit_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(patients_router, prefix="/api/v1")
app.include_router(staff_router, prefix="/api/v1")
