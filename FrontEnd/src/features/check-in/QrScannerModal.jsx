import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, CheckCircle2, X } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

import { registerCheckInWithQr } from '../../services/checkInService'
import '../../styles/check-in.css'

const QR_READER_ID = 'kinepro-check-in-reader'

function QrScannerModal({ user, onClose }) {
  const scannerRef = useRef(null)
  const scanFinishedRef = useRef(false)
  const [status, setStatus] = useState('Abriendo cámara...')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [scannerAttempt, setScannerAttempt] = useState(1)

  async function stopScanner(scannerToStop = scannerRef.current) {
    if (!scannerToStop) {
      return
    }

    try {
      await scannerToStop.stop()
    } catch {
      // Si la cámara ya estaba cerrada, no hace falta mostrar error.
    }

    try {
      scannerToStop.clear()
    } catch {
      // Clear puede fallar si el lector todavía no terminó de montar.
    }

    if (scannerRef.current === scannerToStop) {
      scannerRef.current = null
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
      const response = await registerCheckInWithQr(user, decodedText)
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

  async function handleClose() {
    await stopScanner()
    onClose()
  }

  function canRetryAfterError() {
    if (error === 'El QR escaneado no pertenece a KinePro') {
      return true
    }

    if (error === 'No se pudo abrir la cámara. Revisá los permisos del navegador.') {
      return true
    }

    return false
  }

  useEffect(() => {
    let shouldStopAfterStart = false
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

        if (shouldStopAfterStart) {
          await stopScanner(scanner)
          return
        }

        setStatus('Apuntá la cámara al QR de recepción')
      } catch {
        if (shouldStopAfterStart) {
          return
        }

        setError('No se pudo abrir la cámara. Revisá los permisos del navegador.')
        setStatus('Cámara no disponible')
      }
    }

    startScanner()

    return () => {
      shouldStopAfterStart = true
      stopScanner(scanner)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerAttempt])

  useEffect(() => {
    if (!successMessage) {
      return undefined
    }

    const closeTimer = window.setTimeout(() => {
      handleClose()
    }, 5000)

    return () => {
      window.clearTimeout(closeTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successMessage])

  return (
    <aside className="staff-detail" aria-label="Escanear QR de asistencia">
      <div className="staff-detail-card check-in-scanner-card">
        <button
          type="button"
          className="staff-detail-close"
          onClick={handleClose}
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
      </div>

      {(successMessage || error) && (
        <div className="check-in-feedback-modal" role="alert">
          <div className="check-in-feedback-card">
            {successMessage && (
              <>
                <CheckCircle2 size={42} strokeWidth={2.5} aria-hidden="true" />
                <h3>Asistencia registrada</h3>
                <p>{successMessage}</p>
                <p className="check-in-feedback-help">El escáner se va a cerrar automáticamente.</p>
                <button type="button" className="staff-register-button" onClick={handleClose}>
                  Cerrar
                </button>
              </>
            )}

            {error && (
              <>
                <AlertTriangle size={42} strokeWidth={2.5} aria-hidden="true" />
                <h3>No se pudo registrar</h3>
                <p>{error}</p>

                {canRetryAfterError() ? (
                  <div className="check-in-feedback-actions">
                    <button type="button" className="staff-register-button" onClick={handleRetry}>
                      Reintentar
                    </button>
                    <button type="button" className="staff-qr-button" onClick={handleClose}>
                      Cerrar
                    </button>
                  </div>
                ) : (
                  <button type="button" className="staff-qr-button" onClick={handleClose}>
                    Cerrar
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

export default QrScannerModal
