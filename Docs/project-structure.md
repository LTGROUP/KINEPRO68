# Estructura del proyecto

## BackEnd

- `app/`: aplicacion principal de FastAPI.
- `app/api/`: rutas HTTP.
- `app/core/`: configuracion central.
- `app/db/`: configuracion relacionada con datos.
- `app/integrations/`: servicios externos como Supabase.
- `app/models/`: modelos internos.
- `app/repositories/`: acceso a datos, por ejemplo consultas a Supabase.
- `app/schemas/`: validacion de entrada y salida.
- `app/services/`: logica de negocio, validaciones, reservas, metricas y auditoria.
- `app/tasks/`: tareas Celery, notificaciones y procesos en segundo plano.
- `app/workers/`: organizacion de workers.
- `scripts/`: comandos auxiliares.
- `supabase/`: migraciones y seeds de Supabase.
- `tests/`: pruebas del backend.

## FrontEnd

- `src/assets/`: recursos visuales.
- `src/components/`: componentes reutilizables.
- `src/constants/`: constantes compartidas.
- `src/context/`: contextos globales.
- `src/features/`: modulos por funcionalidad.
- `src/hooks/`: hooks personalizados.
- `src/layouts/`: estructuras de pagina.
- `src/lib/`: configuracion de librerias externas.
- `src/pages/`: pantallas completas.
- `src/routes/`: rutas del frontend.
- `src/services/`: llamadas a API o servicios.
- `src/styles/`: estilos globales y Tailwind.
- `src/utils/`: helpers generales.
- `tests/`: pruebas del frontend.
