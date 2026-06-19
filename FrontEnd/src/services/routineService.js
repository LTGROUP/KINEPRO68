import { buildActorHeaders, request } from './authService'

export function createRoutine(actor, payload) {
  return request('/api/v1/routines', {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function getPatientRoutine(actor, patientId) {
  return request(`/api/v1/routines/patient/${patientId}`, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export function getMyRoutine(actor) {
  return request('/api/v1/routines/me', {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export function updateRoutine(actor, routineId, payload) {
  return request(`/api/v1/routines/${routineId}`, {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function deleteRoutine(actor, routineId) {
  return request(`/api/v1/routines/${routineId}`, {
    method: 'DELETE',
    headers: buildActorHeaders(actor),
  })
}
