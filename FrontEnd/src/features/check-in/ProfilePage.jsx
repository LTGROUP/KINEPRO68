import { useState } from 'react'
import { QrCode } from 'lucide-react'

import QrScannerModal from './QrScannerModal'
import '../../styles/check-in.css'

function ProfilePage({ user }) {
  const [showScanner, setShowScanner] = useState(false)
  const isPatient = user.rol === 'paciente'

  function handleOpenScanner() {
    setShowScanner(true)
  }

  function handleCloseScanner() {
    setShowScanner(false)
  }

  return (
    <main className="staff-page">
      <section className="staff-shell" aria-labelledby="profile-title">
        <section className="staff-panel profile-panel" aria-label="Perfil">
          <div className="staff-panel-header">
            <div>
              <h1 id="profile-title">Perfil</h1>
              <p>
                {user.nombre} · {user.rol}
              </p>
            </div>
          </div>

          <div className="profile-check-in-card">
            <div>
              <p className="staff-eyebrow">Asistencia</p>
              <h2>Registrar llegada al turno</h2>
              <p>
                Cuando llegues a la clínica, escaneá el QR de recepción para marcar tu
                asistencia.
              </p>
            </div>

            {isPatient ? (
              <button type="button" className="staff-register-button" onClick={handleOpenScanner}>
                <QrCode size={19} strokeWidth={3} aria-hidden="true" />
                Escanear QR
              </button>
            ) : (
              <p className="profile-check-in-note">
                Esta acción está disponible para pacientes.
              </p>
            )}
          </div>
        </section>
      </section>

      {showScanner && <QrScannerModal onClose={handleCloseScanner} />}
    </main>
  )
}

export default ProfilePage
