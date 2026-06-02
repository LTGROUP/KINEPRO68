import { useState } from 'react'
import { Users } from 'lucide-react'

import { getTodosLosTurnos, getListaEspera } from '../../../services/turnosService'

function formatTime(timeStr) {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function formatDatetime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ListaEsperaView({ user }) {
  const [fecha, setFecha] = useState('')
  const [turnos, setTurnos] = useState([])
  const [loadingTurnos, setLoadingTurnos] = useState(false)
  const [errorTurnos, setErrorTurnos] = useState('')
  const [selectedTurnoId, setSelectedTurnoId] = useState('')
  const [listaEspera, setListaEspera] = useState(null)
  const [loadingLista, setLoadingLista] = useState(false)
  const [errorLista, setErrorLista] = useState('')

  async function handleBuscarFecha(event) {
    event.preventDefault()

    if (!fecha) return

    setLoadingTurnos(true)
    setErrorTurnos('')
    setTurnos([])
    setSelectedTurnoId('')
    setListaEspera(null)

    try {
      const data = await getTodosLosTurnos(user, fecha)
      // Solo mostramos los turnos RESERVADOS (los que pueden tener lista de espera)
      const reservados = (data.turnos || []).filter(t => t.estado === 'reservado')
      setTurnos(reservados)
    } catch (err) {
      setErrorTurnos(err.message)
    } finally {
      setLoadingTurnos(false)
    }
  }

  async function handleVerLista(turnoId) {
    setSelectedTurnoId(turnoId)
    setLoadingLista(true)
    setErrorLista('')
    setListaEspera(null)

    try {
      const data = await getListaEspera(user, turnoId)
      setListaEspera(data)
    } catch (err) {
      setErrorLista(err.message)
    } finally {
      setLoadingLista(false)
    }
  }

  return (
    <div className="turnos-espera-layout" style={{ marginTop: '24px' }}>
      <form className="turnos-espera-search" onSubmit={handleBuscarFecha}>
        <label className="staff-form-field" htmlFor="espera-fecha">
          Fecha del turno
          <input
            id="espera-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </label>
        <button type="submit" className="staff-register-button" disabled={!fecha || loadingTurnos}>
          {loadingTurnos ? 'Buscando...' : 'Buscar turnos'}
        </button>
      </form>

      {errorTurnos && (
        <p className="staff-message error">{errorTurnos}</p>
      )}

      {!loadingTurnos && fecha && turnos.length === 0 && !errorTurnos && (
        <p className="staff-empty">No hay turnos llenos (reservados) para esta fecha.</p>
      )}

      {turnos.length > 0 && (
        <div className="turnos-espera-slots">
          <p className="turnos-slots-heading">
            Turnos llenos del <strong>{formatDateLabel(fecha)}</strong> — seleccioná uno para ver su lista de espera
          </p>
          <div className="turnos-slots-grid">
            {turnos.map((turno) => (
              <button
                key={turno.id}
                type="button"
                className={`turnos-slot-card${selectedTurnoId === turno.id ? ' active' : ''}`}
                onClick={() => handleVerLista(turno.id)}
              >
                <span className="turnos-slot-time">
                  {formatTime(turno.hora_inicio)} – {formatTime(turno.hora_fin)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loadingLista && (
        <p className="staff-empty">Cargando lista de espera...</p>
      )}

      {errorLista && (
        <p className="staff-message error">{errorLista}</p>
      )}

      {listaEspera && (
        <div className="turnos-espera-result">
          <p className="turnos-slots-heading">
            Lista de espera — {listaEspera.total} {listaEspera.total === 1 ? 'paciente' : 'pacientes'}
            {listaEspera.mensaje && <span> · {listaEspera.mensaje}</span>}
          </p>

          {listaEspera.total === 0 ? (
            <div className="turnos-empty-state">
              <Users size={32} aria-hidden="true" />
              <p>No hay pacientes en lista de espera para este turno.</p>
            </div>
          ) : (
            <div className="turnos-list">
              {listaEspera.pacientes.map((paciente) => (
                <div key={paciente.id} className="turnos-list-item">
                  <div className="turnos-espera-posicion">
                    #{paciente.posicion}
                  </div>
                  <div className="turnos-list-info">
                    <strong className="turnos-list-id">
                      {paciente.nombre && paciente.apellido
                        ? `${paciente.nombre} ${paciente.apellido}`
                        : `Paciente ${String(paciente.paciente_id).slice(0, 8)}…`}
                    </strong>
                    {paciente.dni && <span>DNI: {paciente.dni}</span>}
                    <span>Inscripto el {formatDatetime(paciente.fecha_inscripcion)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ListaEsperaView
