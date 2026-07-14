from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.integrations.supabase.client import get_supabase_admin_client


BUCKET_NAME = "medical-studies"
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


def ensure_study_bucket_exists() -> None:
    client = get_supabase_admin_client()

    try:
        client.storage.get_bucket(BUCKET_NAME)
        return
    except Exception:
        pass

    client.storage.create_bucket(
        BUCKET_NAME,
        options={
            "public": True,
            "file_size_limit": MAX_FILE_SIZE_BYTES,
            "allowed_mime_types": ["application/pdf"],
        },
    )


def validate_pdf(file: UploadFile, content: bytes) -> None:
    extension = Path(file.filename or "").suffix.lower()

    if extension != ".pdf" or file.content_type != "application/pdf":
        raise ValueError("Solo se pueden adjuntar archivos PDF")

    if not content:
        raise ValueError("El archivo PDF no puede estar vacío")

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise ValueError("El PDF no puede superar los 10MB")


def upload_study_pdf(file: UploadFile) -> str:
    content = file.file.read()
    validate_pdf(file, content)
    ensure_study_bucket_exists()

    safe_filename = Path(file.filename or "estudio.pdf").name.replace(" ", "_")
    storage_path = f"studies/{uuid4()}-{safe_filename}"

    bucket = get_supabase_admin_client().storage.from_(BUCKET_NAME)
    bucket.upload(
        storage_path,
        content,
        file_options={
            "content-type": "application/pdf",
            "cache-control": "3600",
        },
    )

    return bucket.get_public_url(storage_path)
