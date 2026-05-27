import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, UserCheck } from 'lucide-react'

import { getAgendaDia, actualizarEstadoTurno } from '../../../services/turnosService'

function getEstadoClass(estado) {
  if (estado === 'reservado') return 'turnos-badge reservado'
  if (estado === 'cancelado') return 'turnos-badge cancelado'
  if (estado === 'presente') return 'turnos-badge' 
  return 'turnos-badge'
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

export function AgendaProfesional({ user }) {
  const [fecha, setFecha] = useState(new Date())
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false 

    async function cargarAgenda() {
      setLoading(true)
      setError('')
      setMessage('')
      setTurnos([])

      try {
        const fechaStr = fecha.toISOString().split('T')[0]
        const data = await getAgendaDia(user, fechaStr)
        
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

  const fechaFormateada = fecha.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  async function marcarPresente(id) {
    setError('')
    setMessage('')
    try {
      await actualizarEstadoTurno(user, id, { nuevo_estado: 'presente' })
      
      setTurnos(turnos.map((t) =>
        t.id === id ? { ...t, estado: 'presente' } : t
      ))
      
      setMessage('El turno fue marcado como presente exitosamente.')
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      console.error("No se pudo marcar el presente", err)
      setError("No se pudo actualizar el estado. Verificá la conexión.")
      setTimeout(() => setError(''), 5000)
    }
  }

  return (
    <div className="turnos-solicitar">
      
      <div className="turnos-week-strip" style={{ display: 'flex', justifyContent: 'center', padding: '16px', marginTop: '24px' }}>
        <div className="turnos-week-header" style={{ width: '100%', maxWidth: '350px' }}>
          <button 
            type="button" 
            className="turnos-week-nav" 
            onClick={diaAnterior} 
            aria-label="Día anterior"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          
          <span className="turnos-month-label" style={{ textTransform: 'capitalize' }}>
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
        {loading && <p className="turnos-agenda-heading">Cargando agenda del día...</p>}
        
        {!loading && error && (
          <div className="staff-feedback-card error" style={{ marginBottom: '16px' }}>
            <p>{error}</p>
          </div>
        )}
        
        {!loading && !error && turnos.length === 0 && (
          <p className="turnos-agenda-heading">No hay turnos agendados para este día.</p>
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

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 16px' }}>
                  <strong style={{ color: '#111827', fontSize: '1rem' }}>
                    {turno.paciente ? `${turno.paciente.nombre} ${turno.paciente.apellido}` : 'Sin datos del paciente'}
                  </strong>
                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Tratamiento: {turno.area_tratamiento ? turno.area_tratamiento.replace('_', ' ') : 'General'}
                  </span>
                </div>

                <span className={getEstadoClass(turno.estado)}>
                  {turno.estado.charAt(0).toUpperCase() + turno.estado.slice(1)}
                </span>

                {turno.estado === 'reservado' ? (
                  <button
                    type="button"
                    className="turnos-agenda-action"
                    onClick={() => marcarPresente(turno.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <UserCheck size={16} />
                    Dar Presente
                  </button>
                ) : (
                  <div style={{ width: '110px' }}></div> 
                )}
                
              </div>
            ))}
          </div>
        )}
      </div>
    {message && (
        <div style={{
          position: 'fixed',
          top: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ffffff',
          padding: '24px 32px',
          borderRadius: '12px',
          boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          minWidth: '340px',
          textAlign: 'left',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <p style={{ 
            color: '#99e3d0', /* El verde menta de tu diseño */
            fontWeight: '900', 
            fontSize: '0.75rem', 
            letterSpacing: '0.05em', 
            textTransform: 'uppercase', 
            margin: '0 0 8px 0' 
          }}>
            Confirmacion
          </p>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            color: '#111827', 
            fontSize: '1.25rem', 
            fontWeight: 'bold' 
          }}>
            Acción realizada
          </h3>
          <p style={{ 
            margin: 0, 
            color: '#4b5563', 
            fontSize: '0.95rem' 
          }}>
            {message}
          </p>
        </div>
      )}
    </div>
  )
}