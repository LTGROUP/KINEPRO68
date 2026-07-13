import { useEffect, useRef, useState } from 'react'

import SolicitarTurnoView from './paciente/SolicitarTurnoView'
import VerListaDeEspera from './paciente/ListasDeEspera'
import MisTurnosView from './paciente/MisTurnosView'
import ConfigurarGrillaView from './secretaria/ConfigurarGrillaView'
import ListaEsperaView from './secretaria/ListaEsperaView'
import AgendaProfesionalView from './profesional/AgendaProfesionalView'
import '../../styles/turnos.css'

function TurnosPage({ user, onSectionChange, tabInicial, onTabInicialConsumido }) {
  const rol = user?.rol
  const [activeTab, setActiveTab] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [preseleccion, setPreseleccion] = useState(null)
  const tabInicialConsumidoRef = useRef(false)
  const onTabInicialConsumidoRef = useRef(onTabInicialConsumido)

  useEffect(() => {
    onTabInicialConsumidoRef.current = onTabInicialConsumido
  }, [onTabInicialConsumido])

  useEffect(() => {
    // Si nos pidieron abrir un tab específico (ej: desde Pacientes), respetalo una sola vez
    if (tabInicial && !tabInicialConsumidoRef.current) {
      tabInicialConsumidoRef.current = true
      setActiveTab(tabInicial)
      if (onTabInicialConsumidoRef.current) onTabInicialConsumidoRef.current()
      return
    }

    if (tabInicialConsumidoRef.current) return

    if (rol === 'paciente') {
      setActiveTab('mis-turnos')
    } else if (rol === 'secretaria' || rol === 'administrative' || rol === 'administrativo') {
      setActiveTab('grilla')
    } else if (rol === 'profesional') {
      setActiveTab('agenda-profesional')
    } else {
      setActiveTab('solicitar')
    }
  }, [rol, tabInicial])

  useEffect(() => {
    if (!successMessage) return undefined

    const id = window.setTimeout(() => setSuccessMessage(''), 5000)
    return () => window.clearTimeout(id)
  }, [successMessage])

  function handleSuccess(msg, tabDestino, seccionDestino) {
    setSuccessMessage(msg)
    if (seccionDestino && onSectionChange) {
      onSectionChange(seccionDestino)  // navega a otra página
    } else if (tabDestino) {
      setActiveTab(tabDestino)  // cambia tab dentro de turnos
    } else if (rol === 'paciente') {
      setActiveTab('mis-turnos')
    }
  }

  function handleTurnoLleno(fecha, turnoId) {
    setPreseleccion({ fecha, turnoId })
    setActiveTab('lista-espera')
  }

  if (!activeTab) return null

  const esPaciente = rol === 'paciente'
  const esSecretaria = rol === 'secretaria' || rol === 'administrativo'
  const esProfesional = rol === 'profesional'

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
                {esProfesional && 'Tu agenda de turnos asignados'}
                {!esPaciente && !esSecretaria && !esProfesional && 'Consultá los turnos disponibles'}
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

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'lista-espera-paciente'}
                className={activeTab === 'lista-espera-paciente' ? 'active' : ''}
                onClick={() => setActiveTab('lista-espera-paciente')}
              >
                Turnos en lista de espera
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
            <SolicitarTurnoView user={user} onSuccess={handleSuccess} />
          )}
          {activeTab === 'mis-turnos' && (
            <MisTurnosView user={user} />
          )}

          {activeTab === 'lista-espera-paciente' && (
            <VerListaDeEspera user={user} />
          )}

          {activeTab === 'grilla' && (
            <ConfigurarGrillaView user={user} onSuccess={handleSuccess} />
          )}
          {activeTab === 'lista-espera' && (
            <ListaEsperaView user={user} />
          )}
          {activeTab === 'agenda-profesional' && (
            <AgendaProfesionalView user={user} />
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
    </main>
  )
}

export default TurnosPage
