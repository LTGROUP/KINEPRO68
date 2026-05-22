import { request } from './authService'

function buildActorHeaders(actor) {
  return {
    Authorization: `Bearer ${actor.access_token}`,
  }
}

function buildPatientsPath(filters) {
  const params = new URLSearchParams()

  if (filters.includeInactive) {
    params.set('include_inactive', 'true')
  }

  const query = params.toString()

  if (query) {
    return `/api/v1/patients?${query}`
  }

  return '/api/v1/patients'
}

export function getPatients(actor, filters = {}) {
  const path = buildPatientsPath(filters)

  return request(path, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export function getPatientDetail(actor, patientId) {
  return request(`/api/v1/patients/${patientId}`, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export function createPatient(actor, payload) {
  return request('/api/v1/patients', {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function updatePatient(actor, patientId, payload) {
  return request(`/api/v1/patients/${patientId}`, {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}
