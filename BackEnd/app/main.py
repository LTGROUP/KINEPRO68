# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import grilla_router as grilla
from app.api.v1 import turnos_router as turnos

app = FastAPI(
    title="KinePro API",
    version="1.0.0",
    description="Backend del sistema de gestión kinesiológica KinePro"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # URL de Vite en desarrollo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(grilla.router, prefix="/api/v1")
app.include_router(turnos.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"status": "KinePro API corriendo"}