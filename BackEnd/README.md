# BackEnd

Backend del sistema KinePro.

Stack previsto:

- Python 3.12.9
- FastAPI
- Supabase
- Celery
- Redis

La carpeta `app/` contiene la aplicacion principal. Las carpetas estan separadas por responsabilidad para que cada integrante pueda trabajar en una parte sin mezclar codigo.

## Rol de FastAPI

FastAPI sera la capa principal entre el frontend y los servicios del backend. Desde aca se van a exponer endpoints para React y se van a centralizar reglas de negocio que no deberian vivir en el cliente.

Responsabilidades previstas:

- reservas y turnos
- control de concurrencia
- metricas
- validaciones
- auditoria
- envio de notificaciones
- coordinacion con Supabase
- disparo de tareas Celery usando Redis

## Instalacion inicial

Crear y activar entorno virtual:

```bash
python -m venv venv
source venv/bin/activate
```
#uvicorn app.main:app --reload

Instalar dependencias:

```bash
pip install -r requirements.txt
```
