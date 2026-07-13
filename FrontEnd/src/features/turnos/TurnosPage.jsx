import { useEffect, useState } from 'react'

import SolicitarTurnoView from './paciente/SolicitarTurnoView'
import MisTurnosView from './paciente/MisTurnosView'
import ConfigurarGrillaView from './secretaria/ConfigurarGrillaView'
import ListaEsperaView from './secretaria/ListaEsperaView'
import '../../styles/turnos.css'

const AREA_LABELS = {
  tren_superior: 'Tren superior',
  tren_medio: 'Tren medio',
  tren_inferior: 'Tren inferior',
}

function formatFechaLarga(fechaStr) {
  if (!fechaStr) return ''
  const [anio, mes, dia] = fechaStr.split('-')
  return `${dia}/${mes}/${anio}`
}

function formatHoraCorta(horaStr) {
  if (!horaStr) return ''
  return horaStr.slice(0, 5)
}

function TurnosPage({ user }) {
  const rol = user?.rol
  const [activeTab, setActiveTab] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [confirmedTurno, setConfirmedTurno] = useState(null)
  const [solicitarResetKey, setSolicitarResetKey] = useState(0)

  useEffect(() => {
    if (rol === 'paciente') {
      setActiveTab('mis-turnos')
    } else if (rol === 'secretaria' || rol === 'administrativo') {
      setActiveTab('grilla')
    } else {
      setActiveTab('solicitar')
    }
  }, [rol])

  useEffect(() => {
    if (!successMessage) return undefined

    const id = window.setTimeout(() => setSuccessMessage(''), 5000)
    return () => window.clearTimeout(id)
  }, [successMessage])

  function handleSuccess(msg, turnoData) {
    if (rol === 'paciente' && turnoData && turnoData.fecha) {
      setConfirmedTurno(turnoData)
      return
    }
    setSuccessMessage(msg)
    if (rol === 'paciente') {
      setActiveTab('mis-turnos')
    }
  }

  function handleReservarOtroTurno() {
    setConfirmedTurno(null)
    setSolicitarResetKey((k) => k + 1)
  }

  function handleVerMisTurnos() {
    setConfirmedTurno(null)
    setActiveTab('mis-turnos')
  }

  if (!activeTab) return null

  const esPaciente = rol === 'paciente'
  const esSecretaria = rol === 'secretaria' || rol === 'administrativo'

  return (
    <main className="staff-page">
      <section className="staff-shell" aria-labelledby="turnos-title">
        <section className="staff-panel" aria-label="Gestión de turnos">
          <div className="staff-panel-header">
            <div>
              <h1 id="turnos-title">Turnos</h1>
              <p>
                {esPaciente && 'Reservá y consultá tus turnos'}
                {esSecretaria && 'Configurá la grilla y gestioná la lista de espera'}
                {!esPaciente && !esSecretaria && 'Consultá los turnos disponibles'}
              </p>
            </div>
          </div>

          {esPaciente && (
            <div className="personal-desktop-tabs" role="tablist" aria-label="Secciones de turnos">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'mis-turnos'}
                className={activeTab === 'mis-turnos' ? 'active' : ''}
                onClick={() => setActiveTab('mis-turnos')}
              >
                Mis turnos
                
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'solicitar'}
                className={activeTab === 'solicitar' ? 'active' : ''}
                onClick={() => setActiveTab('solicitar')}
              >
                Solicitar turno
              </button>
            </div>
          )}

          {esSecretaria && (
            <div className="personal-desktop-tabs" role="tablist" aria-label="Secciones de gestión">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'grilla'}
                className={activeTab === 'grilla' ? 'active' : ''}
                onClick={() => setActiveTab('grilla')}
              >
                Configurar grilla
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'lista-espera'}
                className={activeTab === 'lista-espera' ? 'active' : ''}
                onClick={() => setActiveTab('lista-espera')}
              >
                Lista de espera
              </button>
            </div>
          )}

          {activeTab === 'solicitar' && (
            <SolicitarTurnoView key={solicitarResetKey} user={user} onSuccess={handleSuccess} />
          )}
          {activeTab === 'mis-turnos' && (
            <MisTurnosView user={user} />
          )}
          {activeTab === 'grilla' && (
            <ConfigurarGrillaView user={user} onSuccess={handleSuccess} />
          )}
          {activeTab === 'lista-espera' && (
            <ListaEsperaView user={user} />
          )}

          {!esPaciente && !esSecretaria && (
            <MisTurnosView user={user} />
          )}
        </section>
      </section>

      {successMessage && (
        <aside className="staff-feedback" aria-label="Confirmación">
          <div className="staff-feedback-card success" role="alert">
            <p className="staff-eyebrow">Confirmación</p>
            <h2>Acción realizada</h2>
            <p>{successMessage}</p>
          </div>
        </aside>
      )}

      {confirmedTurno && (
        <aside className="staff-detail" aria-label="Turno confirmado">
          <div className="staff-detail-card staff-confirm-card">
            <p className="staff-eyebrow">Confirmación</p>
            <h2>Turno confirmado</h2>

            <div className="turnos-confirm-summary">
              <div className="flex justify-between text-sm">
                <span>Día</span>
                <span>{formatFechaLarga(confirmedTurno.fecha)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Horario</span>
                <span>
                  {formatHoraCorta(confirmedTurno.hora_inicio)} – {formatHoraCorta(confirmedTurno.hora_fin)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Área de tratamiento</span>
                <span>
                  {AREA_LABELS[confirmedTurno.area_tratamiento] || confirmedTurno.area_tratamiento}
                </span>
              </div>
            </div>

            <div className="staff-confirm-actions">
              <button
                type="button"
                className="staff-confirm-button secondary"
                onClick={handleReservarOtroTurno}
              >
                Reservar otro turno
              </button>
              <button
                type="button"
                className="staff-confirm-button primary"
                onClick={handleVerMisTurnos}
              >
                Ver mis turnos
              </button>
            </div>
          </div>
        </aside>
      )}
    </main>
  )
}

export default TurnosPage
