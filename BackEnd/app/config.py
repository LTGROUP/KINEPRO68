from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str

    supabase_jwt_secret: str
    database_url: str

    app_login_url: str = "http://localhost:5173/"
    cors_allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_from_name: str = "KinePro"
    smtp_use_tls: bool = True

    @property
    def supabase_key(self) -> str:
        return self.supabase_anon_key

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()