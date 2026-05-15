# API

La API del backend usara Python y FastAPI.

FastAPI sera la capa de comunicacion entre el frontend y el backend. React deberia consumir endpoints de FastAPI para operaciones que requieran reglas de negocio, validaciones, auditoria, metricas, concurrencia o tareas en segundo plano.

## Responsabilidades previstas

- Gestion de reservas y turnos.
- Manejo de concurrencia para evitar conflictos de horarios.
- Validaciones de negocio.
- Auditoria de acciones importantes.
- Metricas operativas.
- Envio de notificaciones.
- Coordinacion con Supabase para datos, auth y servicios relacionados.
- Disparo de tareas asincronicas con Celery y Redis.

Esta documentacion puede incluir:

- endpoints
- contratos request/response
- autenticacion
- codigos de error
- convenciones de versionado
