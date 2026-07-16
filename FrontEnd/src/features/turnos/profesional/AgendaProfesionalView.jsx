import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Filter,
  Search,
  X,
} from 'lucide-react'

import { getAgendaHoy, getAgendaPorFecha } from '../../../services/profesionalService'
import { getMedicalRecord } from '../../../services/medicalRecordService'
import {
  createSessionNote,
  getPatientSessionNotes,
} from '../../../services/sessionNoteService'
import ClinicalHistoryPanel from '../../professionals/ClinicalHistoryPanel'
import MedicalRecordDetail from '../../professionals/MedicalRecordDetail'
import { getEstadoClass } from '../../../utils/estadoColors'

function formatTime(timeStr) {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

function normalizar(texto) {
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function turnoCoincideBusqueda(turno, terminoNormalizado) {
  if (!terminoNormalizado) return true

  const nombreCompleto = turno.paciente
    ? `${turno.paciente.nombre || ''} ${turno.paciente.apellido || ''}`
    : ''
  const dni = turno.paciente?.dni || ''

  return (
    normalizar(nombreCompleto).includes(terminoNormalizado) ||
    normalizar(dni).includes(terminoNormalizado)
  )
}

function getDateOnly(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function getNombrePaciente(turno) {
  if (turno.paciente) {
    return `${turno.paciente.nombre} ${turno.paciente.apellido}`
  }

  return 'Sin datos del paciente'
}

function getNombreArea(area) {
  if (!area) return 'General'
  return area.replace(/_/g, ' ')
}

// modo: 'inicio' muestra solo el día de hoy, sin navegación.
// modo: 'historial' permite navegar a días anteriores (no a futuros).
export function AgendaProfesionalView({ user, modo = 'inicio' }) {
  const soloHoy = modo === 'inicio'
  const [fecha, setFecha] = useState(new Date())
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [areaFiltro, setAreaFiltro] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [gruposExpandidos, setGruposExpandidos] = useState(new Set())
  const [patientForSessionNotes, setPatientForSessionNotes] = useState(null)
  const [sessionNotes, setSessionNotes] = useState([])
  const [loadingSessionNotes, setLoadingSessionNotes] = useState(false)
  const [savingSessionNote, setSavingSessionNote] = useState(false)
  const [patientForMedicalRecord, setPatientForMedicalRecord] = useState(null)
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState(null)
  const [loadingMedicalRecord, setLoadingMedicalRecord] = useState(false)
  const [medicalRecordError, setMedicalRecordError] = useState('')

  useEffect(() => {
    let cancelled = false

    const hoy = new Date()
    const mismaFecha =
      fecha.getFullYear() === hoy.getFullYear() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getDate() === hoy.getDate()

    async function cargarAgenda() {
      setLoading(true)
      setError('')
      setTurnos([])

      try {
        let data
        if (mismaFecha) {
          data = await getAgendaHoy(user)
        } else {
          const fechaStr = fecha.toLocaleDateString('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
          })
          data = await getAgendaPorFecha(user, fechaStr)
        }

        if (!cancelled) {
          setTurnos((data.turnos || []).filter((turno) => turno != null))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Error al cargar la agenda.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    cargarAgenda()
    return () => {
      cancelled = true
    }
  }, [fecha, user])

  useEffect(() => {
    setGruposExpandidos(new Set())
    setBusqueda('')
  }, [fecha])

  function diaAnterior() {
    setFecha((prev) => {
      const nueva = new Date(prev)
      nueva.setDate(nueva.getDate() - 1)
      return nueva
    })
  }

  function diaSiguiente() {
    setFecha((prev) => {
      const nueva = new Date(prev)
      nueva.setDate(nueva.getDate() + 1)
      return nueva
    })
  }

  async function handleOpenSessionRecord(turno) {
    if (!turno.paciente?.id) {
      return
    }

    setPatientForSessionNotes(turno.paciente)
    setLoadingSessionNotes(true)
    setSessionNotes([])

    try {
      const response = await getPatientSessionNotes(user, turno.paciente.id)
      setSessionNotes(response.items || [])
    } catch {
      setSessionNotes([])
    } finally {
      setLoadingSessionNotes(false)
    }
  }

  async function handleOpenMedicalRecord(turno) {
    if (!turno.paciente?.id) {
      return
    }

    setPatientForMedicalRecord(turno.paciente)
    setSelectedMedicalRecord(null)
    setMedicalRecordError('')
    setLoadingMedicalRecord(true)

    try {
      const record = await getMedicalRecord(user, turno.paciente.id)
      setSelectedMedicalRecord(record)
    } catch (err) {
      setMedicalRecordError(err.message || 'No se pudo obtener la historia clínica.')
    } finally {
      setLoadingMedicalRecord(false)
    }
  }

  async function handleRegisterSessionNote(values) {
    if (!patientForSessionNotes?.id) {
      return
    }

    setSavingSessionNote(true)

    try {
      const createdNote = await createSessionNote(user, {
        paciente_id: patientForSessionNotes.id,
        actividad_realizada: values.actividad_realizada,
        evolucion: values.evolucion,
      })

      setSessionNotes((currentNotes) => [createdNote, ...currentNotes])
    } finally {
      setSavingSessionNote(false)
    }
  }

  const hoy = new Date()
  const esHoy =
    fecha.getFullYear() === hoy.getFullYear() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getDate() === hoy.getDate()
  const puedeRegistrarSesion = getDateOnly(fecha) <= getDateOnly(hoy)

  const textoFecha = fecha.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const fechaFormateada = esHoy ? `HOY - ${textoFecha}` : textoFecha
  const busquedaNormalizada = normalizar(busqueda.trim())

  const turnosFiltradosPorArea = useMemo(
    () => (areaFiltro ? turnos.filter((turno) => turno.area_tratamiento === areaFiltro) : turnos),
    [turnos, areaFiltro],
  )

  const turnosFiltrados = useMemo(
    () => turnosFiltradosPorArea.filter((turno) => turnoCoincideBusqueda(turno, busquedaNormalizada)),
    [turnosFiltradosPorArea, busquedaNormalizada],
  )

  const grupos = useMemo(() => {
    const mapa = new Map()

    for (const turno of turnosFiltrados) {
      const key = `${turno.hora_inicio}-${turno.hora_fin}`
      if (!mapa.has(key)) {
        mapa.set(key, {
          key,
          hora_inicio: turno.hora_inicio,
          hora_fin: turno.hora_fin,
          turnos: [],
        })
      }
      mapa.get(key).turnos.push(turno)
    }

    return Array.from(mapa.values()).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }, [turnosFiltrados])

  function toggleGrupo(key) {
    setGruposExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function limpiarBusqueda() {
    setBusqueda('')
  }

  const botonFiltroEstilo = (isActive) => ({
    padding: '8px 12px',
    background: isActive ? '#d1fae5' : 'transparent',
    color: isActive ? '#065f46' : '#374151',
    border: 'none',
    borderRadius: '6px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: isActive ? 'bold' : 'normal',
  })

  return (
    <div className="turnos-solicitar">
      <div
        className="turnos-week-strip"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px',
          marginTop: '24px',
        }}
      >
        <div
          className="turnos-week-header"
          style={{
            width: '100%',
            maxWidth: '480px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {soloHoy ? (
            <span
              className="turnos-month-label"
              style={{ textTransform: 'capitalize', textAlign: 'center', flex: 1 }}
            >
              {fechaFormateada}
            </span>
          ) : (
            <>
              <button
                type="button"
                className="turnos-week-nav"
                onClick={diaAnterior}
                aria-label="Día anterior"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>

              <span
                className="turnos-month-label"
                style={{ textTransform: 'capitalize', textAlign: 'center', flex: 1 }}
              >
                {fechaFormateada}
              </span>

              <button
                type="button"
                className="turnos-week-nav"
                onClick={diaSiguiente}
                aria-label="Día siguiente"
                disabled={esHoy}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '480px', marginTop: '12px' }}>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <button
              type="button"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: areaFiltro ? '#d1fae5' : '#f3f4f6', border: 'none', padding: '9px 14px', borderRadius: '16px', fontSize: '0.85rem', cursor: 'pointer', color: areaFiltro ? '#065f46' : '#374151', fontWeight: '500', whiteSpace: 'nowrap' }}
            >
              <Filter size={14} />
              {areaFiltro ? `Filtrado: ${areaFiltro.replace('_', ' ')}` : 'Filtrar por Área'}
            </button>

            {mostrarFiltros && (
              <div style={{ position: 'absolute', top: '38px', left: 0, backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
                <button type="button" onClick={() => { setAreaFiltro(''); setMostrarFiltros(false) }} style={botonFiltroEstilo(areaFiltro === '')}>
                  Todas las áreas
                </button>
                <button type="button" onClick={() => { setAreaFiltro('tren_superior'); setMostrarFiltros(false) }} style={botonFiltroEstilo(areaFiltro === 'tren_superior')}>
                  Tren Superior
                </button>
                <button type="button" onClick={() => { setAreaFiltro('tren_medio'); setMostrarFiltros(false) }} style={botonFiltroEstilo(areaFiltro === 'tren_medio')}>
                  Tren Medio
                </button>
                <button type="button" onClick={() => { setAreaFiltro('tren_inferior'); setMostrarFiltros(false) }} style={botonFiltroEstilo(areaFiltro === 'tren_inferior')}>
                  Tren Inferior
                </button>
              </div>
            )}
          </div>

          {!loading && !error && turnos.length > 0 && (
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por nombre o DNI del paciente..."
                style={{
                  width: '100%',
                  padding: '9px 36px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={limpiarBusqueda}
                  aria-label="Limpiar búsqueda"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="turnos-agenda">
        {loading && <p className="turnos-agenda-heading">Cargando agenda del día...</p>}

        {!loading && error && (
          <div className="staff-feedback-card error" style={{ marginBottom: '16px' }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && turnos.length === 0 && (
          <p className="turnos-agenda-heading">
            {soloHoy ? 'No tenés turnos asignados para hoy.' : 'No tenés turnos asignados para este día.'}
          </p>
        )}

        {!loading && !error && turnos.length > 0 && grupos.length === 0 && (
          <p className="turnos-agenda-heading">No se encontraron pacientes que coincidan con la búsqueda.</p>
        )}

        {!loading && !error && grupos.length > 0 && (
          <div className="turnos-agenda-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {grupos.map((grupo) => {
              const expandido = busquedaNormalizada ? true : gruposExpandidos.has(grupo.key)

              return (
                <div key={grupo.key} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                  <button
                    type="button"
                    onClick={() => toggleGrupo(grupo.key)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      background: '#f9fafb',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Clock size={16} aria-hidden="true" />
                      <span style={{ fontWeight: 600, color: '#111827' }}>
                        {formatTime(grupo.hora_inicio)} - {formatTime(grupo.hora_fin)}
                      </span>
                      <span style={{
                        background: '#0D4A3A',
                        color: '#fff',
                        borderRadius: '999px',
                        padding: '2px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}>
                        {grupo.turnos.length} {grupo.turnos.length === 1 ? 'turno' : 'turnos'}
                      </span>
                    </div>
                    {expandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {expandido && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {grupo.turnos.map((turno) => (
                        <div
                          key={turno.id}
                          className="turnos-agenda-item"
                          style={{ borderTop: '1px solid #f1f5f9' }}
                        >
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 16px' }}>
                            <strong style={{ color: '#111827', fontSize: '1rem' }}>
                              {getNombrePaciente(turno)}
                            </strong>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                              Tratamiento: {getNombreArea(turno.area_tratamiento)}
                            </span>
                          </div>

                          <span className={getEstadoClass(turno.estado)}>
                            {turno.estado ? turno.estado.charAt(0).toUpperCase() + turno.estado.slice(1) : ''}
                          </span>

                          {turno.paciente?.id && (
                            <div className="agenda-action-buttons">
                              <button
                                type="button"
                                className="staff-register-button agenda-session-button"
                                onClick={() => handleOpenMedicalRecord(turno)}
                              >
                                Historia clínica
                              </button>

                              {puedeRegistrarSesion && (
                                <button
                                  type="button"
                                  className="staff-register-button agenda-session-button"
                                  onClick={() => handleOpenSessionRecord(turno)}
                                >
                                  Registrar sesión
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {patientForSessionNotes && (
        <aside className="staff-detail" aria-label="Registrar sesión">
          <div className="staff-detail-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => {
                setPatientForSessionNotes(null)
                setSessionNotes([])
              }}
              aria-label="Cerrar registro de sesión"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>

            <h2 className="clinical-history-title">Registrar sesión</h2>
            <p className="staff-confirm-copy">
              {patientForSessionNotes.nombre} {patientForSessionNotes.apellido}
            </p>

            <ClinicalHistoryPanel
              notes={sessionNotes}
              loading={loadingSessionNotes}
              saving={savingSessionNote}
              onRegister={handleRegisterSessionNote}
            />
          </div>
        </aside>
      )}

      {patientForMedicalRecord && (
        <aside className="staff-detail" aria-label="Historia clínica">
          <div className="staff-detail-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => {
                setPatientForMedicalRecord(null)
                setSelectedMedicalRecord(null)
                setMedicalRecordError('')
              }}
              aria-label="Cerrar historia clínica"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>

            <h2 className="clinical-history-title">Historia clínica</h2>
            <p className="staff-confirm-copy">
              {patientForMedicalRecord.nombre} {patientForMedicalRecord.apellido}
            </p>

            {loadingMedicalRecord && <p className="staff-empty">Cargando historia clínica...</p>}
            {!loadingMedicalRecord && medicalRecordError && <p className="staff-empty">{medicalRecordError}</p>}
            {!loadingMedicalRecord && selectedMedicalRecord && (
              <MedicalRecordDetail record={selectedMedicalRecord} />
            )}
          </div>
        </aside>
      )}
    </div>
  )
}

export default AgendaProfesionalView
