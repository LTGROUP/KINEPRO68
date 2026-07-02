import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, X, Calendar, Activity } from 'lucide-react'

import { getTurnosParaPaciente, solicitarTurno, reprogramarTurno, inscribirseListaEspera } from '../../../services/turnosService'

const AREAS = [
  { value: 'tren_superior', label: 'Tren superior' },
  { value: 'tren_medio', label: 'Tren medio' },
  { value: 'tren_inferior', label: 'Tren inferior' },
]

const DIA_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MES_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const DIA_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function getMinDate() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d
}

function getWeekStart(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return d
}

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

function toDateStr(date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

function isTurnoBlocked(fechaStr, horaInicioStr) {
  const turnoDateTime = new Date(`${fechaStr}T${horaInicioStr}`)
  const limite = new Date()
  limite.setHours(limite.getHours() + 48)
  return turnoDateTime < limite
}

function groupTurnosByTime(turnos) {
  const seen = new Set()
  const result = []
  for (const turno of turnos) {
    const key = `${turno.hora_inicio}-${turno.hora_fin}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(turno)
    }
  }
  return result
}

function formatLongDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return `${DIA_LONG[date.getDay()]} ${d} de ${MES_NAMES[Number(m) - 1]}`
}

function SolicitarTurnoView({ user, targetPatient, onSuccess, turnoAReprogramar }) {
  const minDate = getMinDate()
  const [weekStart, setWeekStart] = useState(() => getWeekStart(minDate))
  const [selectedDate, setSelectedDate] = useState(null)
  const [turnos, setTurnos] = useState([])
  const [loadingTurnos, setLoadingTurnos] = useState(false)
  const [errorTurnos, setErrorTurnos] = useState('')
  const [selectedTurno, setSelectedTurno] = useState(null)
  const [areaTratamiento, setAreaTratamiento] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorSolicitar, setErrorSolicitar] = useState('')
  const [turnoConfirmado, setTurnoConfirmado] = useState(null)

  // Estados para lista de espera
  const [showListaEspera, setShowListaEspera] = useState(false)
  const [turnoListaEspera, setTurnoListaEspera] = useState(null)

  const weekDays = getWeekDays(weekStart)

  const monthLabel = (() => {
    const first = weekDays[0]
    const last = weekDays[6]
    if (first.getMonth() === last.getMonth()) {
      return `${MES_NAMES[first.getMonth()]} ${first.getFullYear()}`
    }
    return `${MES_NAMES[first.getMonth()]} – ${MES_NAMES[last.getMonth()]} ${last.getFullYear()}`
  })()

  const canGoPrev = (() => {
    const lastDayOfPrevWeek = new Date(weekStart)
    lastDayOfPrevWeek.setDate(lastDayOfPrevWeek.getDate() - 1)
    return lastDayOfPrevWeek >= minDate
  })()

  useEffect(() => {
    if (!selectedDate) {
      setTurnos([])
      return
    }
    let cancelled = false

    async function cargarTurnos() {
      setLoadingTurnos(true)
      setErrorTurnos('')
      setTurnos([])

      try {
        const data = await getTurnosParaPaciente(selectedDate)
        if (!cancelled) setTurnos(data.turnos || [])
      } catch (err) {
        if (!cancelled) setErrorTurnos(err.message)
      } finally {
        if (!cancelled) setLoadingTurnos(false)
      }
    }

    Promise.resolve().then(cargarTurnos)
    return () => { cancelled = true }
  }, [selectedDate])

  function prevWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  function nextWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  function handleSelectDay(day) {
    const dateStr = toDateStr(day)
    if (selectedDate === dateStr) return
    setSelectedDate(dateStr)
    setSelectedTurno(null)
    setAreaTratamiento('')
    setErrorSolicitar('')
  }

  function handleSelectTurno(turno) {
    setSelectedTurno(turno)
    setAreaTratamiento('')
    setErrorSolicitar('')
  }

  function handleCloseModal() {
    setSelectedTurno(null)
    setAreaTratamiento('')
    setErrorSolicitar('')
  }

  function handleListaEspera(turno) {
    setTurnoListaEspera(turno)
    setAreaTratamiento('')
    setErrorSolicitar('')
    setShowListaEspera(true)
  }

  function handleCloseListaEspera() {
    setShowListaEspera(false)
    setTurnoListaEspera(null)
    setAreaTratamiento('')
    setErrorSolicitar('')
  }

  async function handleInscribirseListaEspera() {
    if (!areaTratamiento) {
      setErrorSolicitar('Debes seleccionar un área de tratamiento')
      return
    }

    if (!turnoListaEspera) return

    setSaving(true)
    setErrorSolicitar('')

    try {
      await inscribirseListaEspera(user, turnoListaEspera.id, areaTratamiento)

      setShowListaEspera(false)
      setTurnoListaEspera(null)
      setAreaTratamiento('')

      if (onSuccess) {
        onSuccess('Te inscribiste correctamente en la lista de espera, te notificaremos cuando se libere un cupo')
      }
    } catch (err) {
      setErrorSolicitar(err.message || 'Error al inscribirse en lista de espera')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmarTurno() {
    if (!areaTratamiento) {
      setErrorSolicitar('Seleccioná un área de tratamiento')
      return
    }

    setSaving(true)
    setErrorSolicitar('')

    try {
      if (turnoAReprogramar) {
        const payload = {
          nuevo_turno_id: selectedTurno.id,
          area_tratamiento: areaTratamiento,
        }
        const data = await reprogramarTurno(user, turnoAReprogramar.id, payload)
        if (onSuccess) onSuccess(data.mensaje || 'El turno fue reprogramado correctamente.')
      } else {
        const payload = {
          turno_id: selectedTurno.id,
          area_tratamiento: areaTratamiento,
        }
        if (targetPatient) {
          payload.paciente_id = targetPatient.id
        }
        const data = await solicitarTurno(user, payload)
        setTurnoConfirmado({
          fecha: data.fecha || selectedDate,
          hora_inicio: data.hora_inicio || selectedTurno.hora_inicio,
          hora_fin: data.hora_fin || selectedTurno.hora_fin,
          area_tratamiento: data.area_tratamiento || areaTratamiento,
        })
      }
    } catch (err) {
      setErrorSolicitar(err.message || 'Error al procesar el turno')
    } finally {
      setSaving(false)
    }
  }

  const todayStr = toDateStr(new Date())

  return (
    <div className="turnos-solicitar">

      {turnoAReprogramar && (
        <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #bfdbfe' }}>
          <p style={{ margin: 0, color: '#1e3a8a', fontSize: '0.9rem' }}>
            <strong>Reprogramando turno:</strong> Elegí la nueva fecha y horario.
          </p>
        </div>
      )}

      <div className="turnos-week-strip">
        <div className="turnos-week-header">
          <button type="button" className="turnos-week-nav" onClick={prevWeek} disabled={!canGoPrev}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span className="turnos-month-label">{monthLabel}</span>
          <button type="button" className="turnos-week-nav" onClick={nextWeek}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="turnos-week-days">
          {weekDays.map((day) => {
            const dateStr = toDateStr(day)
            const isDisabled = day < minDate
            const isSelected = selectedDate === dateStr
            const isToday = todayStr === dateStr

            return (
              <button
                key={dateStr}
                type="button"
                className={['turnos-day-btn', isSelected && 'selected', isToday && 'today'].filter(Boolean).join(' ')}
                disabled={isDisabled}
                onClick={() => handleSelectDay(day)}
              >
                <span className="turnos-day-name">{DIA_NAMES[day.getDay()]}</span>
                <span className="turnos-day-number">{day.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {!selectedDate && <p className="turnos-no-date">Seleccioná un día para ver los turnos disponibles.</p>}

      {selectedDate && (
        <div className="turnos-agenda">
          {loadingTurnos && <p className="turnos-agenda-heading">Cargando turnos...</p>}
          {!loadingTurnos && errorTurnos && <p className="staff-message error">{errorTurnos}</p>}

          {!loadingTurnos && !errorTurnos && (
            <p className="turnos-agenda-heading">
              {turnos.length === 0
                ? `No hay turnos disponibles el ${formatLongDate(selectedDate)}.`
                : `${groupTurnosByTime(turnos).length} horarios disponibles el ${formatLongDate(selectedDate)}`}
            </p>
          )}

          {!loadingTurnos && turnos.length > 0 && (
            <div className="turnos-agenda-list">
              {(turnoAReprogramar
                ? groupTurnosByTime(turnos).filter(t => t.estado === 'disponible')
                : groupTurnosByTime(turnos)
              ).map((turno) => (
                <div key={`${turno.hora_inicio}-${turno.hora_fin}`} className={`turnos-agenda-item${selectedTurno?.id === turno.id ? ' selected' : ''}`}>
                  <div className="turnos-agenda-time">
                    <Clock size={14} aria-hidden="true" />
                    <span>{formatTime(turno.hora_inicio)}</span>
                    <span className="turnos-agenda-sep">–</span>
                    <span>{formatTime(turno.hora_fin)}</span>
                  </div>
                  <span className="turnos-agenda-duration">60 min</span>
                  {(() => {
                    const blocked = isTurnoBlocked(selectedDate, turno.hora_inicio)

                    if (blocked) {
                      return (
                        <button type="button" className="turnos-agenda-action" disabled>
                          Fuera de término
                        </button>
                      )
                    }

                    if (turno.estado === 'reservado') {
                      if (turnoAReprogramar) return null
                      return (
                        <button
                          type="button"
                          className="turnos-agenda-action"
                          onClick={() => handleListaEspera(turno)}
                        >
                          Lista de espera
                        </button>
                      )
                    }

                    return (
                      <button
                        type="button"
                        className="turnos-agenda-action"
                        onClick={() => handleSelectTurno(turno)}
                      >
                        Seleccionar
                      </button>
                    )
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: LISTA DE ESPERA */}
      {showListaEspera && turnoListaEspera && (
        <aside className="staff-detail">
          <div className="staff-detail-card staff-confirm-card">
            <button type="button" className="staff-detail-close" onClick={handleCloseListaEspera}>
              <X size={18} />
            </button>

            <p className="staff-eyebrow">Lista de espera</p>
            <h2>
              {formatLongDate(selectedDate)} · {formatTime(turnoListaEspera.hora_inicio)} - {formatTime(turnoListaEspera.hora_fin)}
            </h2>
            <p className="staff-confirm-copy">
              Seleccioná el área de tratamiento para anotarte en lista de espera.
            </p>

            <div className="turnos-confirm-area">
              {AREAS.map((area) => (
                <button
                  key={area.value}
                  type="button"
                  className={`turnos-area-option${areaTratamiento === area.value ? ' active' : ''}`}
                  onClick={() => setAreaTratamiento(area.value)}
                >
                  {area.label}
                </button>
              ))}
            </div>

            {errorSolicitar && <p className="staff-message error" style={{ marginTop: '12px' }}>{errorSolicitar}</p>}

            <div className="staff-confirm-actions">
              <button type="button" className="staff-confirm-button secondary" onClick={handleCloseListaEspera}>
                Cancelar
              </button>
              <button
                type="button"
                className="staff-confirm-button primary"
                onClick={handleInscribirseListaEspera}
                disabled={saving || !areaTratamiento}
              >
                {saving ? 'Inscribiendo...' : 'Inscribirse en lista de espera'}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* MODAL: SOLICITAR / REPROGRAMAR */}
      {selectedTurno && (
        <aside className="staff-detail">
          <div className="staff-detail-card staff-confirm-card">
            <button type="button" className="staff-detail-close" onClick={handleCloseModal}>
              <X size={18} strokeWidth={3} />
            </button>

            <p className="staff-eyebrow">{turnoAReprogramar ? 'Confirmar Reprogramación' : 'Reservar turno'}</p>
            <h2>{formatLongDate(selectedDate)} · {formatTime(selectedTurno.hora_inicio)} – {formatTime(selectedTurno.hora_fin)}</h2>
            <p className="staff-confirm-copy">Seleccioná el área de tratamiento para este turno.</p>

            <div className="turnos-confirm-area">
              {AREAS.map((area) => (
                <button
                  key={area.value}
                  type="button"
                  className={`turnos-area-option${areaTratamiento === area.value ? ' active' : ''}`}
                  onClick={() => setAreaTratamiento(area.value)}
                >
                  {area.label}
                </button>
              ))}
            </div>

            {errorSolicitar && (
              <p className="staff-message error" style={{ marginTop: '12px' }}>{errorSolicitar}</p>
            )}

            <div className="staff-confirm-actions">
              <button type="button" className="staff-confirm-button secondary" onClick={handleCloseModal}>
                Cancelar
              </button>
              <button
                type="button"
                className="staff-confirm-button primary"
                onClick={handleConfirmarTurno}
                disabled={saving}
              >
                {saving
                  ? (turnoAReprogramar ? 'Reprogramando...' : 'Reservando...')
                  : (turnoAReprogramar ? 'Reprogramar turno' : 'Confirmar turno')}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* MODAL: TURNO CONFIRMADO - HU-9 */}
      {turnoConfirmado && (
        <aside className="staff-detail">
          <div className="staff-detail-card staff-confirm-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => {
                setTurnoConfirmado(null)
                setSelectedTurno(null)
                setAreaTratamiento('')
                setSelectedDate(null)
                setTurnos([])
              }}
            >
              <X size={18} />
            </button>

            <p className="staff-eyebrow">Turno confirmado</p>

            <div style={{
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '12px 16px',
              margin: '16px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} />
                <span>{formatLongDate(turnoConfirmado.fecha)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} />
                <span>{formatTime(turnoConfirmado.hora_inicio)} – {formatTime(turnoConfirmado.hora_fin)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} />
                <span>{AREAS.find(a => a.value === turnoConfirmado.area_tratamiento)?.label}</span>
              </div>
            </div>

            <p className="staff-confirm-copy">
              Te enviaremos un recordatorio por email 24hs antes.
            </p>

            <div className="staff-confirm-actions">
              <button
                type="button"
                className="staff-confirm-button secondary"
                onClick={() => {
                  setTurnoConfirmado(null)
                  setSelectedTurno(null)
                  setAreaTratamiento('')
                  setSelectedDate(null)
                  setTurnos([])
                }}
              >
                Reservar otro turno
              </button>
              <button
                type="button"
                className="staff-confirm-button primary"
                onClick={() => {
                  setTurnoConfirmado(null)
                  setSelectedTurno(null)
                  setAreaTratamiento('')
                  setSelectedDate(null)
                  setTurnos([])
                  if (onSuccess) onSuccess('El turno fue reservado correctamente.')
                }}
              >
                Ver mis turnos
              </button>
            </div>
          </div>
        </aside>
      )}

    </div>
  )
}

export default SolicitarTurnoView