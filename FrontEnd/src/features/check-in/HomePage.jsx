import { useState } from 'react'
import { QrCode } from 'lucide-react'

import QrScannerModal from './QrScannerModal'
import '../../styles/check-in.css'

function HomePage({ user }) {
  const [showScanner, setShowScanner] = useState(false)
  const isPatient = user.rol === 'paciente'

  function handleOpenScanner() {
    setShowScanner(true)
  }

  function handleCloseScanner() {
    setShowScanner(false)
  }

  if (!isPatient) {
    return (
      <section className="app-placeholder" aria-labelledby="home-title">
        <p className="app-placeholder-eyebrow">KinePro</p>
        <h1 id="home-title">Inicio</h1>
        <p>Esta pantalla queda lista para que el equipo agregue su funcionalidad.</p>
      </section>
    )
  }

  return (
    <main className="staff-page">
      <section className="staff-shell" aria-labelledby="home-title">
        <section className="staff-panel profile-panel" aria-label="Inicio">
          <div className="staff-panel-header">
            <div>
              <h1 id="home-title">Inicio</h1>
              <p>{user.nombre} · paciente</p>
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

            <button type="button" className="staff-register-button" onClick={handleOpenScanner}>
              <QrCode size={19} strokeWidth={3} aria-hidden="true" />
              Escanear QR
            </button>
          </div>
        </section>
      </section>

      {showScanner && <QrScannerModal onClose={handleCloseScanner} />}
    </main>
  )
}

export default HomePage
