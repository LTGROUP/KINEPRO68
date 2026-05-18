# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    database_url: str
    supabase_jwt_secret: str  # ← agregar esto

    class Config:
        env_file = ".env"

settings = Settings()