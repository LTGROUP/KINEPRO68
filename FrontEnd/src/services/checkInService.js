import { CHECK_IN_QR_VALUE } from '../features/check-in/checkInConfig'
import { buildActorHeaders, request } from './authService'

export function registerCheckInWithQr(actor, qrText) {
  if (qrText !== CHECK_IN_QR_VALUE) {
    throw new Error('El QR escaneado no pertenece a KinePro')
  }

  return request('/api/v1/check-in', {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: {
      qr_value: qrText,
    },
  })
}
