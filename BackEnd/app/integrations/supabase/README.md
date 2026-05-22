# supabase

Integraciones con Supabase.

- `client.py`: crea los clientes de Supabase.
- `SUPABASE_ANON_KEY`: se usa para iniciar sesion como usuario.
- `SUPABASE_SERVICE_ROLE_KEY`: se usa desde FastAPI para crear usuarios en Auth y escribir en `profiles`.

La `service_role key` no se usa nunca en el frontend.

Integracion del backend con Supabase.

Aca puede vivir el cliente de Supabase para Python y funciones de acceso a Auth, Storage, Realtime o Database cuando se usen desde FastAPI.
