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
