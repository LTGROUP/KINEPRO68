import { request } from './authService'

function buildActorHeaders(actor) {
  return {
    Authorization: `Bearer ${actor.access_token}`,
  }
}

export function getTurnosDisponibles(fecha) {
  return request(`/api/v1/turnos/disponibles?fecha=${fecha}`, {
    method: 'GET',
  })
}

export function solicitarTurno(actor, payload) {
  return request('/api/v1/turnos/solicitar', {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function getMisTurnos(actor) {
  return request('/api/v1/turnos/mis-turnos', {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export function getListaEspera(actor, turnoId) {
  return request(`/api/v1/turnos/${turnoId}/lista-espera`, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export async function inscribirseListaEspera(user, turnoId, areaTratamiento) {
  return request(`/api/v1/turnos/${turnoId}/lista-espera`, {
    method: 'POST',
    headers: buildActorHeaders(user),
    body: {
      area_tratamiento: areaTratamiento,
    },
  })
}

export function generarGrilla(actor, payload) {
  return request('/api/v1/grilla/generar', {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function bloquearDia(actor, payload) {
  return request('/api/v1/grilla/bloquear-dia', {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function getAgendaDia(actor, fecha, area = '') {
  let url = `/api/v1/turnos/agenda?fecha=${fecha}`
  if (area) {
    url += `&area=${area}`
  }
  return request(url, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export function actualizarEstadoTurno(actor, turnoId, payload) {
  return request(`/api/v1/turnos/${turnoId}/asistencia`, {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function getTurnosParaPaciente(fecha) {
  return request(`/api/v1/turnos/paciente?fecha=${fecha}`, {
    method: 'GET',
  })
}

export function getAuthHeader(user) {
  const token = user?.access_token || user?.token

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

// ---> FUNCIONES AGREGADAS PARA REPROGRAMAR Y CANCELAR <---
export function cancelarTurno(actor, turnoId) {
  return request(`/api/v1/turnos/${turnoId}/cancelar`, {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
  })
}

export function reprogramarTurno(actor, turnoId, payload) {
  return request(`/api/v1/turnos/${turnoId}/reprogramar`, {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function getTodosLosTurnos(actor, fecha) {
  return request(`/api/v1/turnos/todos?fecha=${fecha}`, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}
