from pathlib import Path
from hashlib import sha256
from sqlite3 import Row, connect
from uuid import uuid4

from app.schemas.auth.register_schema import RegisterRequest


DATABASE_PATH = Path(__file__).resolve().parents[4] / "local_kinepro.db"


def hash_password_for_local_db(password: str) -> str:
    # Hash simple solo para desarrollo local; al pasar a Supabase no usamos esto.
    return sha256(password.encode("utf-8")).hexdigest()


def verify_password_for_local_db(password: str, hashed_password: str) -> bool:
    return hash_password_for_local_db(password) == hashed_password


def init_local_db() -> None:
    # Crea la tabla local si todavia no existe, asi el equipo puede probar sin Supabase.
    with connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                apellido TEXT NOT NULL,
                dni TEXT NOT NULL UNIQUE,
                telefono TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                obra_social TEXT NOT NULL,
                fecha_nacimiento TEXT NOT NULL,
                password TEXT NOT NULL,
                rol TEXT NOT NULL,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def get_user_by_dni(dni: str) -> Row | None:
    init_local_db()
    with connect(DATABASE_PATH) as connection:
        connection.row_factory = Row
        return connection.execute(
            "SELECT * FROM profiles WHERE dni = ?",
            (dni,),
        ).fetchone()


def get_user_by_email(email: str) -> Row | None:
    init_local_db()
    with connect(DATABASE_PATH) as connection:
        connection.row_factory = Row
        return connection.execute(
            "SELECT * FROM profiles WHERE email = ?",
            (email,),
        ).fetchone()


def create_user(data: RegisterRequest) -> str:
    init_local_db()
    user_id = str(uuid4())

    with connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            INSERT INTO profiles (
                id,
                nombre,
                apellido,
                dni,
                telefono,
                email,
                obra_social,
                fecha_nacimiento,
                password,
                rol
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                data.nombre,
                data.apellido,
                data.dni,
                data.telefono,
                data.email,
                data.obra_social,
                data.fecha_nacimiento.isoformat(),
                # Guardamos la contrasena hasheada, nunca en texto plano.
                hash_password_for_local_db(data.password),
                "paciente",
            ),
        )

    return user_id
