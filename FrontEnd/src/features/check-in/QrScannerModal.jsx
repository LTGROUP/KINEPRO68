import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

import { registerCheckInWithQr } from '../../services/checkInService'
import '../../styles/check-in.css'

const QR_READER_ID = 'kinepro-check-in-reader'

function QrScannerModal({ onClose }) {
  const scannerRef = useRef(null)
  const scanFinishedRef = useRef(false)
  const [status, setStatus] = useState('Abriendo cámara...')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [scannerAttempt, setScannerAttempt] = useState(1)

  async function stopScanner() {
    if (!scannerRef.current) {
      return
    }

    try {
      await scannerRef.current.stop()
    } catch {
      // Si la cámara ya estaba cerrada, no hace falta mostrar error.
    }

    try {
      scannerRef.current.clear()
    } catch {
      // Clear puede fallar si el lector todavía no terminó de montar.
    }
  }

  async function handleQrDetected(decodedText) {
    if (scanFinishedRef.current) {
      return
    }

    scanFinishedRef.current = true
    setStatus('Registrando asistencia...')
    setError('')
    setSuccessMessage('')

    await stopScanner()

    try {
      const response = await registerCheckInWithQr(decodedText)
      setSuccessMessage(response.message)
      setStatus('Asistencia procesada')
    } catch (requestError) {
      setError(requestError.message)
      setStatus('No se pudo registrar la asistencia')
    }
  }

  function handleRetry() {
    scanFinishedRef.current = false
    setError('')
    setSuccessMessage('')
    setStatus('Abriendo cámara...')
    setScannerAttempt((currentAttempt) => currentAttempt + 1)
  }

  function shouldShowRetryButton() {
    if (error) {
      return true
    }

    if (successMessage) {
      return true
    }

    return false
  }

  useEffect(() => {
    const scanner = new Html5Qrcode(QR_READER_ID)
    scannerRef.current = scanner

    async function startScanner() {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: {
              width: 240,
              height: 240,
            },
          },
          handleQrDetected,
        )

        setStatus('Apuntá la cámara al QR de recepción')
      } catch {
        setError('No se pudo abrir la cámara. Revisá los permisos del navegador.')
        setStatus('Cámara no disponible')
      }
    }

    startScanner()

    return () => {
      stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerAttempt])

  return (
    <aside className="staff-detail" aria-label="Escanear QR de asistencia">
      <div className="staff-detail-card check-in-scanner-card">
        <button
          type="button"
          className="staff-detail-close"
          onClick={onClose}
          aria-label="Cerrar escáner"
        >
          <X size={18} strokeWidth={3} aria-hidden="true" />
        </button>

        <p className="staff-eyebrow">Asistencia</p>
        <h2>Escanear QR</h2>

        <div className="check-in-camera-box">
          <div id={QR_READER_ID} className="check-in-reader" />
        </div>

        <div className="check-in-status">
          <Camera size={19} strokeWidth={2.6} aria-hidden="true" />
          <p>{status}</p>
        </div>

        {successMessage && <p className="check-in-result success">{successMessage}</p>}
        {error && <p className="check-in-result error">{error}</p>}

        {shouldShowRetryButton() && (
          <button type="button" className="staff-qr-button check-in-retry-button" onClick={handleRetry}>
            Reintentar
          </button>
        )}
      </div>
    </aside>
  )
}

export default QrScannerModal
