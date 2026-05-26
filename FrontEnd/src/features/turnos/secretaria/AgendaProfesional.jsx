import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, UserCheck } from 'lucide-react'

// Acá traemos las funciones reales que le pegan al backend
import { getAgendaDia, actualizarEstadoTurno } from '../../../services/turnosService'

// FUNCIONES DE AYUDA (Estilos y formato)
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

  // Efecto para buscar los turnos reales cuando cambia el día
  useEffect(() => {
    let cancelled = false // Previene errores si el usuario cambia muy rápido de día

    async function cargarAgenda() {
      setLoading(true)
      setError('')
      setTurnos([])

      try {
        // Formateamos la fecha a "YYYY-MM-DD" para que la entienda FastAPI
        const fechaStr = fecha.toISOString().split('T')[0]
        
        // Llamada real al servicio
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

  // Funciones para navegar en los días
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

  // Función conectada al backend para dar el presente
  async function marcarPresente(id) {
    try {
      // 1. Le manda el aviso al servidor de FastAPI
      await actualizarEstadoTurno(user, id, { estado: 'presente' })
      
      // 2. Si el servidor dice "OK", lo actualiza visualmente en React
      setTurnos(turnos.map((t) =>
        t.id === id ? { ...t, estado: 'presente' } : t
      ))
    } catch (err) {
      console.error("No se pudo marcar el presente", err)
      alert("Hubo un error de conexión al actualizar el estado.")
    }
  }

  return (
    <div className="turnos-solicitar">
      
      {/* CABECERA: Selector de días */}
      <div className="turnos-week-strip" style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
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

      {/* CUERPO: Lista de turnos del día */}
      <div className="turnos-agenda">
        {loading && <p className="turnos-agenda-heading">Cargando agenda del día...</p>}
        
        {!loading && error && <p className="staff-message error">{error}</p>}
        
        {!loading && !error && turnos.length === 0 && (
          <p className="turnos-agenda-heading">No hay turnos agendados para este día.</p>
        )}
        
        {!loading && !error && turnos.length > 0 && (
          <div className="turnos-agenda-list">
            {turnos.map((turno) => (
              <div key={turno.id} className="turnos-agenda-item">
                
                {/* Bloque 1: Hora */}
                <div className="turnos-agenda-time">
                  <Clock size={14} aria-hidden="true" />
                  <span>{formatTime(turno.hora_inicio)}</span>
                  <span className="turnos-agenda-sep">–</span>
                  <span>{formatTime(turno.hora_fin)}</span>
                </div>

                {/* Bloque 2: Datos del Paciente */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 16px' }}>
                  <strong style={{ color: '#111827', fontSize: '1rem' }}>{turno.paciente}</strong>
                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Tratamiento: {turno.area_tratamiento}</span>
                </div>

                {/* Bloque 3: Estado (capitaliza la primera letra) */}
                <span className={getEstadoClass(turno.estado)}>
                  {turno.estado.charAt(0).toUpperCase() + turno.estado.slice(1)}
                </span>

                {/* Bloque 4: Botón de Acción */}
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

    </div>
  )
}
