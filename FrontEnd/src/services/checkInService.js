import { CHECK_IN_QR_VALUE } from '../features/check-in/checkInConfig'

export async function registerCheckInWithQr(qrText) {
  // Por ahora esto simula el backend. Cuando exista el endpoint real,
  // esta funcion va a hacer el POST para registrar la asistencia.
  if (qrText !== CHECK_IN_QR_VALUE) {
    throw new Error('El QR escaneado no pertenece a KinePro')
  }

  return {
    message: 'QR correcto. La asistencia quedaría registrada para el turno del paciente.',
  }
}
