import logging
import os
import smtplib
import ssl
from html import escape
from email.message import EmailMessage
from pathlib import Path

import certifi
from dotenv import load_dotenv


BACKEND_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(BACKEND_ENV_PATH)

logger = logging.getLogger(__name__)


def get_email_config() -> dict[str, str | int | bool] | None:
    host = os.getenv("SMTP_HOST", "").strip()
    port = os.getenv("SMTP_PORT", "").strip()
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", "").strip()

    if not all([host, port, username, password, from_email]):
        return None

    try:
        parsed_port = int(port)
    except ValueError:
        logger.error("SMTP_PORT no es un numero valido")
        return None

    return {
        "host": host,
        "port": parsed_port,
        "username": username,
        "password": password,
        "from_email": from_email,
        "from_name": os.getenv("SMTP_FROM_NAME", "KinePro").strip(),
        "use_tls": os.getenv("SMTP_USE_TLS", "true").lower() == "true",
        "login_url": os.getenv("APP_LOGIN_URL", "http://127.0.0.1:5173/").strip(),
    }


def _send_simple_email(to: str, subject: str, plain_text: str, html: str) -> bool:
    """Helper interno compartido: arma el mensaje y lo manda por SMTP."""
    config = get_email_config()

    if not config:
        logger.info("Email no enviado: falta configurar SMTP en BackEnd/.env")
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{config['from_name']} <{config['from_email']}>"
    message["To"] = to
    message.set_content(plain_text)
    message.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(str(config["host"]), int(config["port"]), timeout=15) as server:
            if config["use_tls"]:
                tls_context = ssl.create_default_context(cafile=certifi.where())
                server.starttls(context=tls_context)
            server.login(str(config["username"]), str(config["password"]))
            server.send_message(message)
    except Exception:
        logger.exception("No se pudo enviar el email a %s", to)
        return False

    return True


def build_account_created_email(nombre: str, rol: str, login_url: str) -> tuple[str, str, str]:
    subject = "Tu cuenta de KinePro fue creada"
    safe_nombre = escape(nombre)
    safe_rol = escape(rol)
    safe_login_url = escape(login_url, quote=True)
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
      <p>Hola {safe_nombre}, tu cuenta de KinePro fue creada correctamente.</p>
      <p>
        Tu contrasena por defecto es tu numero de documento.
        Por seguridad, te recomendamos cambiarla desde tu perfil cuando ingreses al sistema.
      </p>
      <p>Rol asignado: <strong>{safe_rol}</strong></p>
      <p>
        <a
          href="{safe_login_url}"
          style="display: inline-block; background: #167761; color: white; padding: 12px 18px; border-radius: 8px; text-decoration: none;"
        >
          Iniciar sesion
        </a>
      </p>
      <p style="color: #61736f;">KinePro</p>
    </div>
    """

    return subject, plain_text, html


def _send_email(config: dict, message: EmailMessage) -> bool:
    try:
        with smtplib.SMTP(str(config["host"]), int(config["port"]), timeout=15) as server:
            if config["use_tls"]:
                tls_context = ssl.create_default_context(cafile=certifi.where())
                server.starttls(context=tls_context)
            server.login(str(config["username"]), str(config["password"]))
            server.send_message(message)
        return True
    except Exception:
        return False


def send_recordatorio_turno(email: str, fecha, hora_inicio, hora_fin, area_tratamiento) -> bool:
    config = get_email_config()
    if not config:
        logger.info("Recordatorio no enviado: falta configurar SMTP en BackEnd/.env")
        return False

    area_str = area_tratamiento.value if hasattr(area_tratamiento, "value") else str(area_tratamiento or "Sin especificar")
    subject = "Recordatorio de turno — KinePro"
    plain_text = (
        f"Hola,\n\n"
        f"Te recordamos que mañana tenés turno en KinePro.\n\n"
        f"Fecha: {fecha}\n"
        f"Horario: {hora_inicio} – {hora_fin}\n"
        f"Área: {area_str}\n\n"
        f"KinePro"
    )
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #17352f; line-height: 1.5;">
      <h1 style="color: #167761;">Recordatorio de turno</h1>
      <p>Hola, te recordamos que mañana tenés turno en KinePro.</p>
      <table style="border-collapse: collapse; margin: 1rem 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #61736f;">Fecha</td><td style="font-weight:bold;">{escape(str(fecha))}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #61736f;">Horario</td><td style="font-weight:bold;">{escape(str(hora_inicio))} – {escape(str(hora_fin))}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #61736f;">Área</td><td style="font-weight:bold;">{escape(area_str)}</td></tr>
      </table>
      <p style="color: #61736f;">KinePro</p>
    </div>
    """

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{config['from_name']} <{config['from_email']}>"
    msg["To"] = email
    msg.set_content(plain_text)
    msg.add_alternative(html, subtype="html")

    sent = _send_email(config, msg)
    if not sent:
        logger.exception("No se pudo enviar el recordatorio de turno a %s", email)
    return sent


def send_oferta_turno_lista_espera(email: str, fecha, hora_inicio, hora_fin, area_tratamiento, link: str) -> bool:
    config = get_email_config()
    if not config:
        logger.info("Oferta de lista de espera no enviada: falta configurar SMTP en BackEnd/.env")
        return False

    area_str = area_tratamiento.value if hasattr(area_tratamiento, "value") else str(area_tratamiento or "Sin especificar")
    safe_link = escape(link, quote=True)
    subject = "Cupo disponible en KinePro — respondé en 4 horas"
    plain_text = (
        f"Hola,\n\n"
        f"Hay un cupo disponible para vos en KinePro.\n\n"
        f"Fecha: {fecha}\n"
        f"Horario: {hora_inicio} – {hora_fin}\n"
        f"Área: {area_str}\n\n"
        f"Tenés 4 horas para aceptar o rechazar desde que recibiste este email.\n"
        f"Accedé al link: {link}\n\n"
        f"KinePro"
    )
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #17352f; line-height: 1.5;">
      <h1 style="color: #167761;">Cupo disponible para vos</h1>
      <p>Hay un cupo disponible en KinePro. Tenés <strong>4 horas</strong> para responder.</p>
      <table style="border-collapse: collapse; margin: 1rem 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #61736f;">Fecha</td><td style="font-weight:bold;">{escape(str(fecha))}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #61736f;">Horario</td><td style="font-weight:bold;">{escape(str(hora_inicio))} – {escape(str(hora_fin))}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #61736f;">Área</td><td style="font-weight:bold;">{escape(area_str)}</td></tr>
      </table>
      <p>
        <a href="{safe_link}"
           style="display:inline-block;background:#167761;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Ver oferta de turno
        </a>
      </p>
      <p style="color:#61736f;font-size:0.85rem;">Si no respondés en 4 horas, el cupo pasará al siguiente paciente en lista de espera.</p>
      <p style="color: #61736f;">KinePro</p>
    </div>
    """

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{config['from_name']} <{config['from_email']}>"
    msg["To"] = email
    msg.set_content(plain_text)
    msg.add_alternative(html, subtype="html")

    sent = _send_email(config, msg)
    if not sent:
        logger.exception("No se pudo enviar la oferta de lista de espera a %s", email)
    return sent


def send_confirmacion_turno(
    to_email: str,
    nombre_paciente: str,
    fecha,
    hora_inicio,
    hora_fin,
    area_tratamiento,
) -> bool:
    config = get_email_config()
    if not config:
        logger.info("Confirmación de turno no enviada: falta configurar SMTP en BackEnd/.env")
        return False

    area_str = area_tratamiento.value if hasattr(area_tratamiento, "value") else str(area_tratamiento or "Sin especificar")
    safe_nombre = escape(nombre_paciente or "")
    subject = "Tu turno fue confirmado — KinePro"
    plain_text = (
        f"Hola {nombre_paciente},\n\n"
        f"Tu turno fue confirmado.\n\n"
        f"Fecha: {fecha}\n"
        f"Horario: {hora_inicio} – {hora_fin}\n"
        f"Área de tratamiento: {area_str}\n\n"
        f"Te esperamos. Recibirás un recordatorio 24hs antes de tu turno.\n\n"
        f"KinePro"
    )
    html = f"""
    <div style="background:#F5F5F5; padding: 24px 0; font-family: Arial, sans-serif;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background:#0D4A3A; padding: 20px 24px;">
          <span style="color:#ffffff; font-size: 20px; font-weight: bold;">KinePro</span>
        </div>
        <div style="padding: 24px; color: #17352f; line-height: 1.5;">
          <h1 style="color: #0D4A3A; font-size: 18px; margin: 0 0 12px;">Tu turno fue confirmado</h1>
          <p style="margin: 0 0 16px;">Hola {safe_nombre}, tu turno en KinePro quedó confirmado.</p>
          <table style="width:100%; border-collapse: collapse; background:#F5F5F5; border-radius: 8px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px 16px; color:#61736f;">Fecha</td>
              <td style="padding: 10px 16px; font-weight:bold; text-align:right;">{escape(str(fecha))}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; color:#61736f;">Horario</td>
              <td style="padding: 10px 16px; font-weight:bold; text-align:right;">{escape(str(hora_inicio))} - {escape(str(hora_fin))}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; color:#61736f;">Área de tratamiento</td>
              <td style="padding: 10px 16px; font-weight:bold; text-align:right;">{escape(area_str)}</td>
            </tr>
          </table>
          <p style="margin: 0 0 16px;">Te esperamos. Recibirás un recordatorio 24hs antes de tu turno.</p>
          <p style="color: #61736f; font-size: 13px; margin: 0;">KinePro</p>
        </div>
      </div>
    </div>
    """

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{config['from_name']} <{config['from_email']}>"
    msg["To"] = to_email
    msg.set_content(plain_text)
    msg.add_alternative(html, subtype="html")

    sent = _send_email(config, msg)
    if not sent:
        logger.exception("No se pudo enviar la confirmación de turno a %s", to_email)
    return sent


def _area_str(area_tratamiento) -> str:
    return area_tratamiento.value if hasattr(area_tratamiento, "value") else str(area_tratamiento or "Sin especificar")


def send_confirmacion_reprogramacion(
    email: str,
    fecha_vieja, hora_inicio_vieja, hora_fin_vieja, area_vieja,
    fecha_nueva, hora_inicio_nueva, hora_fin_nueva, area_nueva,
) -> bool:
    config = get_email_config()
    if not config:
        logger.info("Confirmación de reprogramación no enviada: falta configurar SMTP en BackEnd/.env")
        return False

    area_vieja_str = _area_str(area_vieja)
    area_nueva_str = _area_str(area_nueva)
    subject = "Turno reprogramado — KinePro"
    plain_text = (
        f"Hola,\n\n"
        f"Tu turno en KinePro fue reprogramado.\n\n"
        f"Turno anterior (dado de baja):\n"
        f"Fecha: {fecha_vieja}\n"
        f"Horario: {hora_inicio_vieja} – {hora_fin_vieja}\n"
        f"Área: {area_vieja_str}\n\n"
        f"Turno nuevo (activo):\n"
        f"Fecha: {fecha_nueva}\n"
        f"Horario: {hora_inicio_nueva} – {hora_fin_nueva}\n"
        f"Área: {area_nueva_str}\n\n"
        f"KinePro"
    )
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #17352f; line-height: 1.5;">
      <h1 style="color: #167761;">Turno reprogramado</h1>
      <p>Hola, tu turno en KinePro fue reprogramado.</p>
      <p style="color: #61736f; margin-bottom: 4px;">Turno anterior (dado de baja)</p>
      <table style="border-collapse: collapse; margin: 0 0 1rem 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #61736f;">Fecha</td><td style="text-decoration: line-through;">{escape(str(fecha_vieja))}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #61736f;">Horario</td><td style="text-decoration: line-through;">{escape(str(hora_inicio_vieja))} – {escape(str(hora_fin_vieja))}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #61736f;">Área</td><td style="text-decoration: line-through;">{escape(area_vieja_str)}</td></tr>
      </table>
      <p style="color: #61736f; margin-bottom: 4px;">Turno nuevo (activo)</p>
      <table style="border-collapse: collapse; margin: 0 0 1rem 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #61736f;">Fecha</td><td style="font-weight:bold;">{escape(str(fecha_nueva))}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #61736f;">Horario</td><td style="font-weight:bold;">{escape(str(hora_inicio_nueva))} – {escape(str(hora_fin_nueva))}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #61736f;">Área</td><td style="font-weight:bold;">{escape(area_nueva_str)}</td></tr>
      </table>
      <p style="color: #61736f;">KinePro</p>
    </div>
    """

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{config['from_name']} <{config['from_email']}>"
    msg["To"] = email
    msg.set_content(plain_text)
    msg.add_alternative(html, subtype="html")

    sent = _send_email(config, msg)
    if not sent:
        logger.exception("No se pudo enviar la confirmación de reprogramación a %s", email)
    return sent


def send_account_created_email(email: str, nombre: str, rol: str) -> bool:
    config = get_email_config()
    subject, plain_text, html = build_account_created_email(
        nombre=nombre,
        rol=rol,
        login_url=str((config or {}).get("login_url", "http://127.0.0.1:5173/")),
    )
    return _send_simple_email(email, subject, plain_text, html)


AREA_TRATAMIENTO_LABELS = {
    "tren_superior": "Tren Superior",
    "tren_medio": "Tren Medio",
    "tren_inferior": "Tren Inferior",
}


def build_cupo_liberado_email(
    nombre: str,
    area_tratamiento: str,
    fecha: str,
    hora_inicio: str,
    hora_fin: str,
    link: str,
    horas_validez: int,
    login_url: str,
) -> tuple[str, str, str]:
    subject = "¡Se liberó un cupo para vos en KinePro!"
    area_label = AREA_TRATAMIENTO_LABELS.get(area_tratamiento, area_tratamiento.replace("_", " ").title())

    safe_nombre = escape(nombre)
    safe_area = escape(area_label)
    safe_link = escape(link, quote=True)

    plain_text = (
        f"Hola {nombre},\n\n"
        "Se liberó un cupo que coincide con tu inscripción en lista de espera.\n\n"
        f"Turno: {fecha} de {hora_inicio} a {hora_fin}\n"
        f"Área: {area_label}\n\n"
        f"Tenés {horas_validez} horas para confirmarlo desde el siguiente link:\n"
        f"{link}\n\n"
        "Pasado ese tiempo, el cupo se ofrecerá al siguiente paciente en la lista.\n\n"
        "KinePro"
    )

    html = f"""
    <div style="background:#F5F5F5; padding: 24px 0; font-family: Arial, sans-serif;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background:#0D4A3A; padding: 20px 24px;">
          <span style="color:#ffffff; font-size: 20px; font-weight: bold;">KinePro</span>
        </div>
        <div style="padding: 24px; color: #17352f; line-height: 1.5;">
          <h1 style="color: #0D4A3A; font-size: 18px; margin: 0 0 12px;">¡Se liberó un cupo para vos!</h1>
          <p style="margin: 0 0 16px;">Hola {safe_nombre}, se liberó un turno que coincide con tu inscripción en lista de espera.</p>
          <table style="width:100%; border-collapse: collapse; background:#F5F5F5; border-radius: 8px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px 16px; color:#61736f;">Fecha</td>
              <td style="padding: 10px 16px; font-weight:bold; text-align:right;">{escape(fecha)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; color:#61736f;">Horario</td>
              <td style="padding: 10px 16px; font-weight:bold; text-align:right;">{escape(hora_inicio)} a {escape(hora_fin)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; color:#61736f;">Área</td>
              <td style="padding: 10px 16px; font-weight:bold; text-align:right;">{safe_area}</td>
            </tr>
          </table>
          <a href="{safe_link}"
             style="display: block; text-align:center; background: #0D4A3A; color: #ffffff; padding: 14px 18px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 12px;">
            Aceptar turno
          </a>
          <a href="{safe_link}"
             style="display: block; text-align:center; background: #ffffff; color: #0D4A3A; padding: 13px 18px; border-radius: 8px; text-decoration: none; font-weight: bold; border: 1px solid #cccccc;">
            Rechazar turno
          </a>
          <p style="color: #61736f; font-size: 13px; margin-top: 20px;">
            Este link vence en {horas_validez} horas. Pasado ese tiempo, el cupo pasará al siguiente paciente en la lista de espera.
          </p>
        </div>
      </div>
    </div>
    """

    return subject, plain_text, html


def send_cupo_liberado_email(
    email: str,
    nombre: str,
    area_tratamiento: str,
    fecha: str,
    hora_inicio: str,
    hora_fin: str,
    link: str,
    horas_validez: int,
) -> bool:
    config = get_email_config()
    subject, plain_text, html = build_cupo_liberado_email(
        nombre=nombre,
        area_tratamiento=area_tratamiento,
        fecha=fecha,
        hora_inicio=hora_inicio,
        hora_fin=hora_fin,
        link=link,
        horas_validez=horas_validez,
        login_url=str((config or {}).get("login_url", "http://127.0.0.1:5173/")),
    )
    return _send_simple_email(email, subject, plain_text, html)

