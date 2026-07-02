import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'

import { getAgendaHoy, getAgendaPorFecha } from '../../../services/profesionalService'
import { getEstadoClass } from '../../../utils/estadoColors'

function formatTime(timeStr) {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

function getNombrePaciente(turno) {
  if (turno.paciente) {
    return `${turno.paciente.nombre} ${turno.paciente.apellido}`
  }
  return 'Paciente sin datos'
}

function getNombreArea(area) {
  if (!area) return 'Área no especificada'
  return area.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AgendaProfesionalView({ user }) {
  const [fecha, setFecha] = useState(new Date())
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [esHoyFlag, setEsHoyFlag] = useState(true)

  useEffect(() => {
    let cancelled = false

    const hoy = new Date()
    const mismaFecha =
      fecha.getFullYear() === hoy.getFullYear() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getDate() === hoy.getDate()

    setEsHoyFlag(mismaFecha)

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
          setTurnos(data.turnos || [])
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

  const textoFecha = fecha.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const fechaFormateada = esHoyFlag ? `HOY - ${textoFecha}` : textoFecha

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
            maxWidth: '380px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
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
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="turnos-agenda">
        {loading && (
          <p className="turnos-agenda-heading">Cargando agenda del día...</p>
        )}

        {!loading && error && (
          <div className="staff-feedback-card error" style={{ marginBottom: '16px' }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && turnos.length === 0 && (
          <p className="turnos-agenda-heading">No tenés turnos asignados para hoy.</p>
        )}

        {!loading && !error && turnos.length > 0 && (
          <div className="turnos-agenda-list">
            {turnos.map((turno) => (
              <div key={turno.id} className="turnos-agenda-item">
                <div className="turnos-agenda-time">
                  <Clock size={14} aria-hidden="true" />
                  <span>{formatTime(turno.hora_inicio)}</span>
                  <span className="turnos-agenda-sep">–</span>
                  <span>{formatTime(turno.hora_fin)}</span>
                </div>

                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    padding: '0 16px',
                  }}
                >
                  <strong style={{ color: '#111827', fontSize: '1rem' }}>
                    {getNombrePaciente(turno)}
                  </strong>
                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Tratamiento: {getNombreArea(turno.area_tratamiento)}
                  </span>
                </div>

                <span className={getEstadoClass(turno.estado)}>
                  {turno.estado.charAt(0).toUpperCase() + turno.estado.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AgendaProfesionalView
