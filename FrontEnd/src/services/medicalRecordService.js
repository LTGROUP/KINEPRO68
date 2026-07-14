import { buildActorHeaders, request } from './authService'

export async function createMedicalRecord(actor, payload) {
  return request('/api/v1/medical-records', {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export async function getMedicalRecord(actor, patientId) {
  return request(`/api/v1/medical-records/patient/${patientId}`, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export async function updateMedicalRecord(actor, recordId, payload) {
  return request(`/api/v1/medical-records/${recordId}`, {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export async function uploadStudyPdf(actor, file) {
  const formData = new FormData()
  formData.append('file', file)

  return request('/api/v1/medical-records/studies/upload-pdf', {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: formData,
  })
}

export async function downloadMedicalRecordPdf(actor, recordId) {
  const response = await request(`/api/v1/medical-records/${recordId}/pdf`, {
    method: 'GET',
    headers: buildActorHeaders(actor),
    responseType: 'blob',
  })

  const blob = response.blob
  const url = window.URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  const disposition = response.headers.get('Content-Disposition')
  let filename = 'ficha-medica.pdf'

  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/)

    if (match) {
      filename = match[1]
    }
  }

  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.URL.revokeObjectURL(url)
}
