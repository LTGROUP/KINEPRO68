import { request } from './authService'

function buildActorHeaders(actor) {
  return {
    Authorization: `Bearer ${actor.access_token}`,
  }
}

function buildStaffPath(filters) {
  const params = new URLSearchParams()

  if (filters.rol) {
    params.set('rol', filters.rol)
  }

  if (filters.includeInactive) {
    params.set('include_inactive', 'true')
  }

  const query = params.toString()

  if (query) {
    return `/api/v1/staff?${query}`
  }

  return '/api/v1/staff'
}

export function getStaff(actor, filters = {}) {
  const path = buildStaffPath(filters)

  return request(path, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export function getStaffDetail(actor, staffId) {
  return request(`/api/v1/staff/${staffId}`, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export function createStaff(actor, payload) {
  return request('/api/v1/staff', {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function updateStaff(actor, staffId, payload) {
  return request(`/api/v1/staff/${staffId}`, {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function deactivateStaff(actor, staffId) {
  return request(`/api/v1/staff/${staffId}`, {
    method: 'DELETE',
    headers: buildActorHeaders(actor),
  })
}
