# staff_management

Rutas de administracion del personal.

Mientras no este integrada la sesion real/Supabase, los permisos se prueban con
headers temporales:

```http
X-Actor-Role: administrativo
X-Actor-Id: 10000001
```

o:

```http
X-Actor-Role: secretaria
X-Actor-Id: 10000002
```

Reglas actuales:

- `administrativo` puede administrar `profesional`, `secretaria` y `administrativo`.
- `secretaria` puede administrar `profesional` y `secretaria`.
- `secretaria` no puede administrar `administrativo`.
- La baja elimina el perfil de forma permanente.
- Si un usuario deja de ser `profesional`, se eliminan sus datos de `professional_profiles`.

Endpoints:

```http
GET /api/v1/staff
GET /api/v1/staff/{staff_id}
POST /api/v1/staff
PATCH /api/v1/staff/{staff_id}
DELETE /api/v1/staff/{staff_id}
```

Ejemplo para crear profesional:

```json
{
  "nombre": "Carlos",
  "apellido": "Rios",
  "dni": "30123456",
  "telefono": "+542211234567",
  "email": "carlos.rios@kinepro.com",
  "fecha_nacimiento": "1988-04-10",
  "obra_social": "OSDE",
  "rol": "profesional",
  "matricula": "MP-30123456",
  "especialidad": "Kinesiologia deportiva",
  "area_tratamiento": "tren inferior"
}
```

Ejemplo para crear secretaria:

```json
{
  "nombre": "Laura",
  "apellido": "Paz",
  "dni": "31123456",
  "telefono": "+542211234568",
  "email": "laura.paz@kinepro.com",
  "fecha_nacimiento": "1991-03-05",
  "obra_social": "IOMA",
  "rol": "secretaria"
}
```
