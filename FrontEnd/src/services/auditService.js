import { request } from './authService'

function buildActorHeaders(actor) {
  return {
    Authorization: `Bearer ${actor.access_token}`,
  }
}

export function getAuditLogs(actor, limit = 50) {
  const params = new URLSearchParams()
  params.set('limit', String(limit))

  return request(`/api/v1/audit?${params.toString()}`, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}
