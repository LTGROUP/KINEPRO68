import { buildActorHeaders, request } from './authService'

export async function getPatientSessionNotes(actor, patientId) {
  return request(`/api/v1/session-notes/patient/${patientId}`, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export async function createSessionNote(actor, payload) {
  return request('/api/v1/session-notes', {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}
