import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'

import { getTodosLosTurnos, getListaEspera, getListaEsperaActivas } from '../../../services/turnosService'

const MES_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

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
  const [turnos, setTurnos] = useState([])
  const [loadingTurnos, setLoadingTurnos] = useState(false)
  const [errorTurnos, setErrorTurnos] = useState('')
  const [selectedTurnoId, setSelectedTurnoId] = useState('')
  const [listaEspera, setListaEspera] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorLista, setErrorLista] = useState('')
  const [loadingLista, setLoadingLista] = useState(false)

  useEffect(() => {
    cargarTurnosConListaEspera()
  }, [user])

  async function cargarTurnosConListaEspera() {
    setLoadingTurnos(true)
    setErrorTurnos('')
    try {
      const data = await getListaEsperaActivas(user)
      setTurnos(data.turnos || [])
    } catch (err) {
      setErrorTurnos(err.message)
    } finally {
      setLoadingTurnos(false)
    }
  }

  const turnosPorMes = {}
  turnos.forEach(t => {
    const key = t.fecha.slice(0, 7)  // "2026-06"
    if (!turnosPorMes[key]) turnosPorMes[key] = []
    turnosPorMes[key].push(t)
  })

  function formatMesLabel(mesKey) {
    const [anio, mes] = mesKey.split('-')
    return `${MES_NAMES[Number(mes) - 1].charAt(0).toUpperCase() + MES_NAMES[Number(mes) - 1].slice(1)} ${anio}`
  }

  return (
    <div className="turnos-espera-layout" style={{ marginTop: '24px' }}>

      {loadingTurnos && (
        <p className="staff-empty">Cargando listas de espera...</p>
      )}

      {errorTurnos && (
        <p className="staff-message error">{errorTurnos}</p>
      )}

      {!loadingTurnos && !errorTurnos && turnos.length === 0 && (
        <p className="staff-empty">No hay turnos con lista de espera activa.</p>
      )}

      {Object.entries(turnosPorMes).map(([mes, turnosDelMes]) => (
        <div key={mes} style={{ marginBottom: '24px' }}>

          <p className="staff-eyebrow" style={{ marginBottom: '8px' }}>
            {formatMesLabel(mes)}
          </p>

          <div className="turnos-list">
            {turnosDelMes.map(turno => (
              <div key={turno.id}>

                <div
                  className={`turnos-list-item${selectedTurnoId === turno.id ? ' selected' : ''}`}
                  onClick={() => handleVerLista(turno.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="turnos-list-info">
                    <strong>{formatDateLabel(turno.fecha)}</strong>
                    <span>{formatTime(turno.hora_inicio)} – {formatTime(turno.hora_fin)}</span>
                  </div>
                </div>

                {selectedTurnoId === turno.id && loadingLista && (
                  <p className="staff-empty">Cargando lista de espera...</p>
                )}

                {selectedTurnoId === turno.id && errorLista && (
                  <p className="staff-message error">{errorLista}</p>
                )}

                {selectedTurnoId === turno.id && listaEspera && (
                  <div style={{
                    backgroundColor: '#f0f6f4',
                    borderLeft: '3px solid #176b5b',
                    borderRadius: '0 0 8px 8px',
                    marginTop: '-4px',
                    marginLeft: '16px',
                    padding: '12px 16px',
                  }}>
                    <p className="turnos-slots-heading" style={{ marginBottom: '12px' }}>
                      Lista de espera — {listaEspera.total} {listaEspera.total === 1 ? 'paciente' : 'pacientes'}
                    </p>
                    <div className="turnos-list">
                      {listaEspera.pacientes.map(paciente => (
                        <div key={paciente.id} className="turnos-list-item">
                          <div className="turnos-espera-posicion">
                            #{paciente.posicion}
                          </div>
                          <div className="turnos-list-info">
                            <strong>
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
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  async function buscarTurnosPorFecha(fechaBuscar) {
    console.log('fechaBuscar:', fechaBuscar)
    setLoadingTurnos(true)
    setErrorTurnos('')
    setTurnos([])
    setSelectedTurnoId('')
    setListaEspera(null)

    try {
      const data = await getTodosLosTurnos(user, fechaBuscar)

      const conteo = {}
        ; (data.turnos || []).forEach(t => {
          const key = t.hora_inicio
          conteo[key] = (conteo[key] || 0) + 1
        })

      const llenos = (data.turnos || []).filter(t =>
        conteo[t.hora_inicio] >= data.turnos_por_slot
      )

      const vistos = new Set()
      const turnosLlenos = llenos.filter(t => {
        if (vistos.has(t.hora_inicio)) return false
        vistos.add(t.hora_inicio)
        return true
      })

      setTurnos(turnosLlenos)
    } catch (err) {
      setErrorTurnos(err.message)
    } finally {
      setLoadingTurnos(false)
    }
  }

  async function handleBuscarFecha(event) {
    event.preventDefault()
    if (!fecha) return
    await buscarTurnosPorFecha(fecha)
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
          Ingrese una fecha
          <input
            id="espera-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </label>
        <button type="submit" className="staff-register-button" disabled={!fecha || loadingTurnos}>
          {loadingTurnos ? 'Buscando...' : 'Consultar turnos'}
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
