# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    
    # Reemplazá 'supabase_key: str' por estas dos:
    supabase_service_role_key: str
    supabase_anon_key: str
    
    supabase_jwt_secret: str
    database_url: str# ← agregar esto

    class Config:
        env_file = ".env"

settings = Settings()