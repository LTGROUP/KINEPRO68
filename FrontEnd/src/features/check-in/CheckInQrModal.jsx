import { Printer, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

import { CHECK_IN_QR_TITLE, CHECK_IN_QR_VALUE } from './checkInConfig'
import '../../styles/check-in.css'

function CheckInQrModal({ onClose }) {
  function handlePrint() {
    window.print()
  }

  return (
    <aside className="staff-detail" aria-label="QR de asistencia">
      <div className="staff-detail-card check-in-qr-card">
        <button
          type="button"
          className="staff-detail-close"
          onClick={onClose}
          aria-label="Cerrar QR"
        >
          <X size={18} strokeWidth={3} aria-hidden="true" />
        </button>

        <p className="staff-eyebrow">Asistencia</p>
        <h2>{CHECK_IN_QR_TITLE}</h2>

        <div className="check-in-qr-print-area">
          <div className="check-in-qr-box">
            <QRCodeSVG
              value={CHECK_IN_QR_VALUE}
              size={260}
              level="H"
              includeMargin
            />
          </div>

          <p className="check-in-qr-code">{CHECK_IN_QR_VALUE}</p>
          <p className="check-in-qr-help">
            Los pacientes deben iniciar sesión, entrar a su perfil y escanear este QR para
            registrar la asistencia.
          </p>
        </div>

        <button type="button" className="staff-register-button check-in-print-button" onClick={handlePrint}>
          <Printer size={18} strokeWidth={3} aria-hidden="true" />
          Imprimir QR
        </button>
      </div>
    </aside>
  )
}

export default CheckInQrModal
