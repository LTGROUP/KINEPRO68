import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, UserCheck, Filter } from 'lucide-react'

import { getAgendaDia, actualizarEstadoTurno } from '../../../services/turnosService'
import { getEstadoClass } from '../../../utils/estadoColors'

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
  
  // NUEVOS ESTADOS PARA EL FILTRO
  const [areaFiltro, setAreaFiltro] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  // ACTUALIZADO: Agregamos areaFiltro a las dependencias y a la llamada
  useEffect(() => {
    let cancelled = false 

    async function cargarAgenda() {
      setLoading(true)
      setError('')
      setMessage('')
      setTurnos([])

      try {
        const fechaStr = fecha.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
        const data = await getAgendaDia(user, fechaStr, areaFiltro)
        
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
  }, [fecha, user, areaFiltro])

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

  // NUEVA LÓGICA: Detectar si es "HOY"
  const hoy = new Date()
  const esHoy = fecha.getDate() === hoy.getDate() &&
                fecha.getMonth() === hoy.getMonth() &&
                fecha.getFullYear() === hoy.getFullYear()

  const textoFecha = fecha.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  
  const fechaFormateada = esHoy ? `HOY - ${textoFecha}` : textoFecha

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

  // Estilo reutilizable para los botones del menú de filtros
  const botonFiltroEstilo = (isActive) => ({
    padding: '8px 12px', 
    background: isActive ? '#d1fae5' : 'transparent', 
    color: isActive ? '#065f46' : '#374151', 
    border: 'none', 
    borderRadius: '6px', 
    textAlign: 'left', 
    cursor: 'pointer', 
    fontSize: '0.875rem',
    fontWeight: isActive ? 'bold' : 'normal'
  })

  return (
    <div className="turnos-solicitar">
      
      {/* CABECERA CON MARGEN, FECHA Y BOTÓN DE FILTRO */}
      <div className="turnos-week-strip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', marginTop: '24px' }}>
        
        <div className="turnos-week-header" style={{ width: '100%', maxWidth: '380px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" className="turnos-week-nav" onClick={diaAnterior} aria-label="Día anterior">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          
          <span className="turnos-month-label" style={{ textTransform: 'capitalize', textAlign: 'center', flex: 1 }}>
            {fechaFormateada}
          </span>
          
          <button type="button" className="turnos-week-nav" onClick={diaSiguiente} aria-label="Día siguiente">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>

        {/* BOTÓN Y MENÚ DE FILTRO FLOTANTE */}
        <div style={{ marginTop: '12px', position: 'relative' }}>
          <button 
            type="button"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: areaFiltro ? '#d1fae5' : '#f3f4f6', border: 'none', padding: '6px 14px', borderRadius: '16px', fontSize: '0.85rem', cursor: 'pointer', color: areaFiltro ? '#065f46' : '#374151', fontWeight: '500' }}
          >
            <Filter size={14} /> 
            {areaFiltro ? `Filtrado: ${areaFiltro.replace('_', ' ')}` : 'Filtrar por Área'}
          </button>

          {mostrarFiltros && (
            <div style={{ position: 'absolute', top: '35px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
              <button onClick={() => { setAreaFiltro(''); setMostrarFiltros(false); }} style={botonFiltroEstilo(areaFiltro === '')}>
                Todas las áreas
              </button>
              <button onClick={() => { setAreaFiltro('tren_superior'); setMostrarFiltros(false); }} style={botonFiltroEstilo(areaFiltro === 'tren_superior')}>
                Tren Superior
              </button>
              <button onClick={() => { setAreaFiltro('tren_medio'); setMostrarFiltros(false); }} style={botonFiltroEstilo(areaFiltro === 'tren_medio')}>
                Tren Medio
              </button>
              <button onClick={() => { setAreaFiltro('tren_inferior'); setMostrarFiltros(false); }} style={botonFiltroEstilo(areaFiltro === 'tren_inferior')}>
                Tren Inferior
              </button>
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
            {areaFiltro ? 'No hay turnos agendados para esta área hoy.' : 'No hay turnos agendados para este día.'}
          </p>
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

      {/* NUEVA NOTIFICACIÓN FLOTANTE (TOAST) */}
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
            color: '#99e3d0', 
            fontWeight: '900', 
            fontSize: '0.75rem', 
            letterSpacing: '0.05em', 
            textTransform: 'uppercase', 
            margin: '0 0 8px 0' 
          }}>
            Confirmación
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