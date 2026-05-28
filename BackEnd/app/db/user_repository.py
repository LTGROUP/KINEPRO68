from pathlib import Path
from hashlib import pbkdf2_hmac, sha256
import hmac
import secrets
from sqlite3 import Row, connect

# Ruta donde se guarda la base de datos SQLite
DATABASE_PATH = Path(__file__).resolve().parents[3] / "local_kinepro.db"


# ==================== FUNCIONES DE HASH Y VERIFICACIÓN ====================

def hash_password_for_local_db(password: str) -> str:
    """Hashea contraseña con PBKDF2 (formato: pbkdf2_sha256$iter$salt$hash)."""
    iterations = 100_000
    salt = secrets.token_hex(16)
    digest = pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        iterations,
    ).hex()
    return f"pbkdf2_sha256${iterations}${salt}${digest}"


def verify_password_for_local_db(password: str, hashed_password: str) -> bool:
    """Compara una contraseña en texto plano con un hash guardado.
    Retorna True si coinciden, False si no."""
    if hashed_password.startswith("pbkdf2_sha256$"):
        try:
            _, iterations_str, salt_hex, expected_digest = hashed_password.split("$", 3)
            candidate = pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                bytes.fromhex(salt_hex),
                int(iterations_str),
            ).hex()
            return hmac.compare_digest(candidate, expected_digest)
        except (ValueError, TypeError):
            return False

    # Compatibilidad con hashes heredados en SHA256 plano.
    legacy_hash = sha256(password.encode("utf-8")).hexdigest()
    return hmac.compare_digest(legacy_hash, hashed_password)


# ==================== INICIALIZACIÓN DE TABLAS ====================

def init_local_db():
    """Crea la tabla 'profiles' si no existe.
    Guarda los datos del usuario: nombre, email, contraseña, etc."""
    with connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,                -- Identificador único del usuario
                nombre TEXT NOT NULL,               -- Nombre del usuario
                apellido TEXT NOT NULL,             -- Apellido del usuario
                dni TEXT NOT NULL UNIQUE,           -- Documento (único)
                telefono TEXT NOT NULL,             -- Teléfono de contacto
                email TEXT NOT NULL UNIQUE,         -- Email (único, para login y recuperación)
                obra_social TEXT NOT NULL,          -- Obra social del paciente
                fecha_nacimiento TEXT NOT NULL,     -- Fecha de nacimiento
                password TEXT NOT NULL,             -- Contraseña hasheada
                rol TEXT NOT NULL,                  -- Rol: paciente, admin, etc.
                activo INTEGER NOT NULL DEFAULT 1,  -- 1=activo, 0=inactivo
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP  -- Fecha de registro
            )
            """
        )


def init_password_reset_tokens_table():
    """Crea la tabla 'password_reset_tokens' si no existe.
    Guarda tokens temporales para recuperación de contraseña."""
    with connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                token TEXT PRIMARY KEY,      -- Token único generado para la recuperación
                email TEXT NOT NULL,         -- Email del usuario que solicitó recuperación
                expires_at TEXT NOT NULL,    -- Fecha/hora de expiración (ej: +15 minutos)
                used INTEGER NOT NULL DEFAULT 0  -- 0=no usado, 1=ya usado para resetear
            )
            """
        )


# ==================== CONSULTAS A LA TABLA PROFILES ====================

def get_user_by_id(user_id: str) -> Row | None:
    """Busca un usuario por su ID.
    Retorna el registro encontrado o None si no existe."""
    init_local_db()
    with connect(DATABASE_PATH) as connection:
        connection.row_factory = Row  # Permite acceder por nombre de columna
        return connection.execute(
            "SELECT * FROM profiles WHERE id = ?", (user_id,)
        ).fetchone()


def get_user_by_dni(dni: str) -> Row | None:
    """Busca un usuario por su DNI.
    Retorna el registro encontrado o None si no existe."""
    init_local_db()
    with connect(DATABASE_PATH) as connection:
        connection.row_factory = Row
        return connection.execute(
            "SELECT * FROM profiles WHERE dni = ?", (dni,)
        ).fetchone()


def get_user_by_email(email: str) -> Row | None:
    """Busca un usuario por su email.
    Retorna el registro encontrado o None si no existe.
    Útil para login y recuperación de contraseña."""
    init_local_db()
    with connect(DATABASE_PATH) as connection:
        connection.row_factory = Row
        return connection.execute(
            "SELECT * FROM profiles WHERE email = ?", (email,)
        ).fetchone()


def update_user_password(user_id: str, hashed_password: str) -> None:
    """Actualiza la contraseña de un usuario en la base de datos.
    Recibe el ID del usuario y la nueva contraseña YA HASHEADA."""
    with connect(DATABASE_PATH) as connection:
        connection.execute(
            "UPDATE profiles SET password = ? WHERE id = ?",
            (hashed_password, user_id),
        )


# ==================== FUNCIONES PARA TOKENS DE RECUPERACIÓN ====================

def save_reset_token(token: str, email: str, expires_at: str):
    """Guarda un token de recuperación en la base de datos.
    - token: string único generado con secrets.token_urlsafe()
    - email: email del usuario que solicitó recuperación
    - expires_at: fecha/hora en formato ISO cuando expira el token"""
    init_password_reset_tokens_table()
    with connect(DATABASE_PATH) as connection:
        connection.execute(
            "INSERT INTO password_reset_tokens (token, email, expires_at) VALUES (?, ?, ?)",
            (token, email, expires_at)
        )


def get_reset_token(token: str):
    """Busca un token de recuperación que NO haya sido usado aún.
    Retorna el registro del token o None si no existe o ya fue usado."""
    init_password_reset_tokens_table()
    with connect(DATABASE_PATH) as connection:
        connection.row_factory = Row
        return connection.execute(
            "SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0",
            (token,)
        ).fetchone()


def mark_token_as_used(token: str):
    """Marca un token como "usado" después de que se reseteó la contraseña.
    Así no se puede usar el mismo token más de una vez."""
    with connect(DATABASE_PATH) as connection:
        connection.execute(
            "UPDATE password_reset_tokens SET used = 1 WHERE token = ?",
            (token,)
        )
