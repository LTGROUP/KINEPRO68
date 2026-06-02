# HU pendientes o incompletas para revisar en demo

Este documento resume las historias de usuario y escenarios que conviene revisar antes de la demo del Grupo B. La idea es separar lo que ya está encaminado de lo que todavía falta probar, ajustar o conectar con otras épicas.

## Criterios de estado

- **Pendiente funcional**: falta implementar lógica o conexión real.
- **Pendiente de validación**: la funcionalidad existe, pero falta cubrir un caso de error de la HU.
- **Pendiente de demo**: está implementado, pero falta mostrarlo en la presentación.
- **Depende de otra épica**: no conviene cerrarlo hasta que otra parte del sistema esté lista.

## Gestión de cuentas y perfiles

### Registrar usuario

Estado general: **parcialmente cubierto**.

Pendientes a revisar:

- Validar registro con DNI ya existente.
- Validar registro con email ya existente.
- Validar registro con email inválido.
- Validar DNI con longitud incorrecta.
- Validar fecha de nacimiento futura.
- Validar persona menor a la edad mínima permitida.
- Confirmar que obra social puede quedar vacía y se guarda como `Sin obra social`.
- Aclarar en demo que la contraseña inicial ya no se pide en el formulario: se crea usando el DNI como contraseña temporal.

### Iniciar sesión

Estado general: **implementado, falta demo completa**.

Pendientes a revisar:

- Login correcto.
- Login con DNI inexistente.
- Login con contraseña incorrecta.
- Mantener sesión iniciada.
- Sesión vencida: confirmar que redirige al login.

### Cerrar sesión

Estado general: **implementado, falta demo si no se mostró**.

Pendientes a revisar:

- Cerrar sesión desde desktop.
- Cerrar sesión desde menú hamburguesa en mobile.
- Confirmar que limpia la sesión y vuelve al login.

### Recuperar contraseña

Estado general: **implementado, falta probar escenarios fallidos**.

Pendientes a revisar:

- Email registrado: llega mail de recuperación.
- Email inexistente: definir si se muestra mensaje genérico o error explícito según decisión del equipo.
- Link vencido o inválido.
- Nueva contraseña menor a 8 caracteres.
- Nueva contraseña igual a la anterior.
- Confirmación de contraseña diferente.
- Confirmar redirección automática al login luego del cambio.

### Cambiar contraseña desde perfil

Estado general: **corregido para Supabase, falta prueba real con cuenta de prueba**.

Pendientes a revisar:

- Contraseña actual correcta y nueva válida.
- Contraseña actual incorrecta.
- Nueva contraseña menor a 8 caracteres.
- Nueva contraseña sin mayúscula.
- Nueva contraseña sin número.
- Nueva contraseña igual a la actual.
- Confirmación distinta a la nueva contraseña.

### Ver datos personales

Estado general: **implementado**.

Pendientes a revisar:

- Confirmar que muestra nombre, apellido, DNI, email, teléfono, obra social, fecha de nacimiento y rol.
- Confirmar vista desktop.
- Confirmar vista mobile.

### Editar datos personales

Estado general: **parcialmente cubierto**.

Pendientes a revisar:

- Editar email correctamente.
- Editar teléfono correctamente.
- Editar obra social correctamente.
- Email con formato inválido.
- Email ya usado por otro usuario.
- Confirmar que nombre, apellido, DNI y fecha de nacimiento no se editan desde frontend.
- Confirmar que backend tampoco modifica nombre, apellido ni fecha aunque se manden en la request.

## Gestión de pacientes

### Registrar paciente

Estado general: **implementado, faltan validaciones de demo**.

Pendientes a revisar:

- Registro correcto.
- DNI existente.
- Email existente.
- Email inválido.
- Fecha de nacimiento futura.
- Obra social vacía.
- Confirmar que se crea usuario en Supabase Auth y perfil en `profiles`.
- Confirmar que se envía email de cuenta creada.

### Listar pacientes

Estado general: **implementado**.

Pendientes a revisar:

- Listado con pacientes.
- Búsqueda por nombre, DNI o email.
- Estado sin resultados.
- Vista mobile.

### Editar paciente

Estado general: **implementado, faltan validaciones de demo**.

Pendientes a revisar:

- Edición correcta.
- Email inválido.
- Email ya usado por otro usuario.
- Confirmar qué campos deben estar bloqueados según la regla final.

### Ver datos de paciente

Estado general: **implementado**.

Pendientes a revisar:

- Abrir modal de datos.
- Confirmar que el fondo se difumina.
- Confirmar cierre del modal.

## Administración del personal

### Listar plantel

Estado general: **implementado**.

Pendientes a revisar:

- Listado general.
- Filtro por profesionales.
- Filtro por secretarias.
- Filtro por administrativos.
- Buscador.
- Vista desktop.
- Vista mobile.

### Crear profesional

Estado general: **implementado, faltan validaciones de demo**.

Pendientes a revisar:

- Creación correcta.
- DNI existente.
- Email existente.
- Email inválido.
- Profesional sin matrícula.
- Profesional sin especialidad.
- Profesional sin área de tratamiento.
- Profesional sin horario de entrada o salida.
- Horario de salida menor o igual al horario de entrada.
- Confirmar si la matrícula debe ser única. Si la HU lo exige, falta validación explícita.

### Editar profesional

Estado general: **implementado, faltan validaciones de demo**.

Pendientes a revisar:

- Editar email, teléfono u obra social.
- Editar especialidad.
- Editar área de tratamiento.
- Editar horarios.
- Confirmar que matrícula no se puede modificar.
- Email ya usado por otro usuario.
- Horario de salida menor o igual al horario de entrada.

### Crear secretaria

Estado general: **implementado, faltan reglas de rol**.

Pendientes a revisar:

- Secretaria puede crear otra secretaria.
- Secretaria no puede crear administrativo.
- Administrativo puede crear administrativo.
- DNI existente.
- Email existente.
- Email inválido.

### Editar secretaria

Estado general: **implementado, falta demo completa**.

Pendientes a revisar:

- Editar email.
- Editar teléfono.
- Editar obra social.
- Confirmar campos bloqueados.
- Email ya usado por otro usuario.

### Eliminar profesional o secretaria

Estado general: **implementado como eliminación directa para testing**.

Pendientes a revisar:

- Modal de confirmación.
- Cancelar baja.
- Confirmar baja.
- Confirmar que desaparece del listado.
- Confirmar que también se elimina de Supabase Auth.
- Confirmar que un usuario no puede darse de baja a sí mismo.
- Definir si para entrega final será baja lógica o eliminación directa.

## Auditoría

### Consultar auditoría

Estado general: **implementado, falta demo completa**.

Pendientes a revisar:

- Registro al crear paciente.
- Registro al editar paciente.
- Registro al crear personal.
- Registro al editar personal.
- Registro al eliminar personal.
- Filtro por acción.
- Filtro por fecha.
- No permitir fecha futura.
- Confirmar que se muestra el actor como rol y DNI, por ejemplo `secretaria · 12345678`.

## QR de asistencia

### Acreditar acceso por QR

Estado general: **flujo visual preparado, conexión final pendiente**.

Pendientes a revisar:

- Botón `Escanear QR` en Inicio del paciente.
- Confirmar que no aparece en Perfil.
- Confirmar que no aparece en roles de staff.
- Apertura de cámara.
- Uso de cámara trasera en celular.
- Botón reintentar.
- Detener cámara al cerrar modal.
- Conectar con turnos reales cuando esté lista la grilla de horarios.

Depende de otra épica:

- Validar que el paciente tenga turno del día.
- Validar que el turno esté abonado.
- Mensajes de error por fecha no correspondiente, sin turno o turno no abonado.

## Prioridad recomendada antes de seguir

1. Probar cambio de contraseña desde perfil con una cuenta real de prueba.
2. Probar email existente en editar perfil.
3. Probar DNI/email existente en pacientes y personal.
4. Probar reglas de roles: secretaria no puede crear administrativo.
5. Confirmar baja: que borre en `profiles`, `professional_profiles` si corresponde y Supabase Auth.
6. Probar auditoría luego de crear, editar y eliminar.
7. Dejar QR como demo visual si todavía no existe grilla de turnos.

## Nota para explicar en demo

Si preguntan por escenarios que todavía dependen de turnos, grilla o pagos, conviene decir:

> Esta parte queda preparada desde frontend y estructura de backend, pero la validación final depende de la épica de turnos/grilla de horarios, que todavía está en desarrollo por otro subgrupo.
