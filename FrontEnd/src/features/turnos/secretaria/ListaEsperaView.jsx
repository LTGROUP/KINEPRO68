import { useState, useEffect } from 'react'

import { getListaEspera, getListaEsperaActivas, cancelarInscripcionListaEsperaSecretaria } from '../../../services/turnosService'

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
  const [loadingLista, setLoadingLista] = useState(false)
  const [errorLista, setErrorLista] = useState('')

  // Estados para la baja de una reserva en lista de espera (HU-13)
  const [modalCancelar, setModalCancelar] = useState(null) // guarda el paciente a dar de baja
  const [idEnCancelacion, setIdEnCancelacion] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const [errorCancelacion, setErrorCancelacion] = useState('')

  useEffect(() => {
    cargarTurnosConListaEspera()
  }, [user])

  useEffect(() => {
    if (!mensajeExito) return undefined

    const id = window.setTimeout(() => setMensajeExito(''), 5000)
    return () => window.clearTimeout(id)
  }, [mensajeExito])

  useEffect(() => {
    if (!errorCancelacion) return undefined

    const id = window.setTimeout(() => setErrorCancelacion(''), 5000)
    return () => window.clearTimeout(id)
  }, [errorCancelacion])

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

  function abrirModalCancelar(paciente) {
    setModalCancelar(paciente)
  }

  async function confirmarCancelarReserva() {
    const paciente = modalCancelar
    setModalCancelar(null)

    setIdEnCancelacion(paciente.id)
    setErrorCancelacion('')

    try {
      const data = await cancelarInscripcionListaEsperaSecretaria(user, paciente.id)
      setMensajeExito(data.mensaje || 'Reserva dada de baja exitosamente')
      await handleVerLista(selectedTurnoId)
      await cargarTurnosConListaEspera()
    } catch (err) {
      setErrorCancelacion(err.message || 'No se pudo cancelar la reserva')
    } finally {
      setIdEnCancelacion('')
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
    <>
    <div className="turnos-espera-layout" style={{ marginTop: '24px' }}>

      {mensajeExito && (
        <p className="staff-message success" style={{ marginBottom: '16px' }}>{mensajeExito}</p>
      )}

      {errorCancelacion && (
        <p className="staff-message error" style={{ marginBottom: '16px' }}>{errorCancelacion}</p>
      )}

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

                          {/* BOTÓN CANCELAR RESERVA — mismo color que "Cancelar" en Mis turnos del paciente */}
                          <button
                            type="button"
                            onClick={() => abrirModalCancelar(paciente)}
                            disabled={idEnCancelacion === paciente.id}
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #f87171',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '0.85rem',
                            }}
                          >
                            {idEnCancelacion === paciente.id ? 'Cancelando...' : 'Cancelar reserva'}
                          </button>
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

    {/* MODAL DE CONFIRMACIÓN — mismo estilo que el de Mis turnos del paciente */}
    {modalCancelar && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white', borderRadius: '12px', padding: '32px',
          maxWidth: '450px', width: '100%',
          boxShadow: '0px 20px 25px -5px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#111827', fontSize: '1.2rem' }}>
            ¿Cancelar reserva?
          </h3>
          <p style={{ color: '#4b5563', marginBottom: '24px' }}>
            {`¿Confirmás dar de baja la reserva de ${modalCancelar.nombre && modalCancelar.apellido
              ? `${modalCancelar.nombre} ${modalCancelar.apellido}`
              : 'este paciente'} en la lista de espera?`}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setModalCancelar(null)}
              style={{
                padding: '8px 20px', borderRadius: '6px', border: '1px solid #d1d5db',
                background: 'white', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              Volver
            </button>
            <button
              onClick={confirmarCancelarReserva}
              style={{
                padding: '8px 20px', borderRadius: '6px', border: 'none',
                background: '#b91c1c', color: 'white', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              Confirmar cancelación
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

export default ListaEsperaView
