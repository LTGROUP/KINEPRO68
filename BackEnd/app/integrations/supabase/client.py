import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client


BACKEND_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(BACKEND_ENV_PATH)


def get_required_env(name: str, fallback_name: str | None = None) -> str:
    value = os.getenv(name)
    if not value and fallback_name:
        value = os.getenv(fallback_name)

    if not value:
        raise RuntimeError(f"Falta configurar {name} en BackEnd/.env")

    return value


@lru_cache
def get_supabase_admin_client() -> Client:
    url = get_required_env("SUPABASE_URL", "VITE_SUPABASE_URL")
    service_key = get_required_env("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, service_key)


@lru_cache
def get_supabase_auth_client() -> Client:
    url = get_required_env("SUPABASE_URL", "VITE_SUPABASE_URL")
    anon_key = get_required_env("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY")
    return create_client(url, anon_key)
