import logging
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv


BACKEND_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(BACKEND_ENV_PATH)

logger = logging.getLogger(__name__)


def get_email_config() -> dict[str, str | int | bool] | None:
    host = os.getenv("SMTP_HOST")
    port = os.getenv("SMTP_PORT")
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM_EMAIL")

    if not all([host, port, username, password, from_email]):
        return None

    return {
        "host": host,
        "port": int(port),
        "username": username,
        "password": password,
        "from_email": from_email,
        "from_name": os.getenv("SMTP_FROM_NAME", "KinePro"),
        "use_tls": os.getenv("SMTP_USE_TLS", "true").lower() == "true",
        "login_url": os.getenv("APP_LOGIN_URL", "http://127.0.0.1:5173/"),
    }


def build_account_created_email(nombre: str, rol: str, login_url: str) -> tuple[str, str, str]:
    subject = "Tu cuenta de KinePro fue creada"
    plain_text = (
        f"Hola {nombre},\n\n"
        "Tu cuenta fue creada con exito.\n"
        "Tu contrasena por defecto es tu numero de documento.\n\n"
        "Por seguridad, te recomendamos cambiarla desde tu perfil cuando ingreses al sistema.\n\n"
        f"Iniciar sesion: {login_url}\n\n"
        "KinePro"
    )
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #17352f; line-height: 1.5;">
      <h1 style="color: #167761;">Cuenta creada con exito</h1>
      <p>Hola {nombre}, tu cuenta de KinePro fue creada correctamente.</p>
      <p>
        Tu contrasena por defecto es tu numero de documento.
        Por seguridad, te recomendamos cambiarla desde tu perfil cuando ingreses al sistema.
      </p>
      <p>Rol asignado: <strong>{rol}</strong></p>
      <p>
        <a
          href="{login_url}"
          style="display: inline-block; background: #167761; color: white; padding: 12px 18px; border-radius: 8px; text-decoration: none;"
        >
          Iniciar sesion
        </a>
      </p>
      <p style="color: #61736f;">KinePro</p>
    </div>
    """

    return subject, plain_text, html


def send_account_created_email(email: str, nombre: str, rol: str) -> bool:
    config = get_email_config()

    if not config:
        logger.info("Email no enviado: falta configurar SMTP en BackEnd/.env")
        return False

    subject, plain_text, html = build_account_created_email(
        nombre=nombre,
        rol=rol,
        login_url=str(config["login_url"]),
    )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{config['from_name']} <{config['from_email']}>"
    message["To"] = email
    message.set_content(plain_text)
    message.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(str(config["host"]), int(config["port"]), timeout=15) as server:
            if config["use_tls"]:
                server.starttls()
            server.login(str(config["username"]), str(config["password"]))
            server.send_message(message)
    except Exception:
        logger.exception("No se pudo enviar el email de cuenta creada")
        return False

    return True
