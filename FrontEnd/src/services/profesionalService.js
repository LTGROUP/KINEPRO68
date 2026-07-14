import { request } from './authService'

function buildActorHeaders(actor) {
  return {
    Authorization: `Bearer ${actor.access_token}`,
  }
}

export function getAgendaHoy(actor) {
  return request('/api/v1/profesional/agenda/hoy', {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export function getAgendaPorFecha(actor, fecha) {
  return request(`/api/v1/profesional/agenda?fecha=${fecha}`, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}
