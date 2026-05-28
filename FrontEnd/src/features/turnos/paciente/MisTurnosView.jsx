import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'

import { getMisTurnos } from '../../../services/turnosService'
import { cancelarTurno } from '../../../services/turnosService'

const AREA_LABELS = {
  tren_superior: 'Tren superior',
  tren_medio: 'Tren medio',
  tren_inferior: 'Tren inferior',
}

const ESTADO_LABELS = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  bloqueado: 'Bloqueado',
  cancelado: 'Cancelado',
}

function getEstadoClass(estado) {
  if (estado === 'reservado') return 'turnos-badge reservado'
  if (estado === 'cancelado') return 'turnos-badge cancelado'
  return 'turnos-badge'
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

function formatFecha(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function MisTurnosView({ user }) {
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // 1. NUEVO: Estado para manejar el cartel flotante
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function cargarMisTurnos() {
      setLoading(true)
      setError('')

      try {
        const data = await getMisTurnos(user)
        setTurnos(data.turnos || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    Promise.resolve().then(cargarMisTurnos)
  }, [user])

  // 2. NUEVO: Función actualizada para usar el Toast en vez del alert()
  async function handleCancelar(turnoId) {
    if (!window.confirm('¿Estás seguro de que querés cancelar este turno?')) return;
    
    try {
      await cancelarTurno(user, turnoId);
      
      // Actualizamos la vista localmente
      setTurnos(turnos.map(t => t.id === turnoId ? { ...t, estado: 'cancelado' } : t));
      
      // Lanzamos el cartel flotante por 5 segundos
      setMessage('El turno fue cancelado y el espacio liberado correctamente.');
      setTimeout(() => setMessage(''), 5000);
      
    } catch (err) {
      alert("No se pudo cancelar el turno. Verificá tu conexión.");
    }
  }

  if (loading) {
    return <p className="staff-empty">Cargando tus turnos...</p>
  }

  if (error) {
    return <p className="staff-message error">{error}</p>
  }

  if (turnos.length === 0) {
    return (
      <div className="turnos-empty-state">
        <CalendarDays size={36} aria-hidden="true" />
        <p>No tenés turnos reservados.</p>
      </div>
    )
  }

  // Envolvemos todo en <> </> para poder poner la lista y el Toast juntos
  return (
    <>
      <div className="turnos-list">
        {turnos.map((turno) => (
          <div key={turno.id} className="turnos-list-item">
            <div className="turnos-list-date">
              <strong>{formatFecha(turno.fecha)}</strong>
              <span>{formatTime(turno.hora_inicio)} – {formatTime(turno.hora_fin)}</span>
            </div>
            <div className="turnos-list-info">
              {turno.area_tratamiento && (
                <span className="turnos-list-area">
                  {AREA_LABELS[turno.area_tratamiento] || turno.area_tratamiento}
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className={getEstadoClass(turno.estado)}>
                {ESTADO_LABELS[turno.estado] || turno.estado}
              </span>

              {turno.estado === 'reservado' && (
                <button
                  type="button"
                  onClick={() => handleCancelar(turno.id)}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #f87171',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
            
          </div>
        ))}
      </div>

      {/* 3. NUEVO: TOAST FLOTANTE */}
      {message && (
        <div style={{
          position: 'fixed', top: '40px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#ffffff', padding: '24px 32px', borderRadius: '12px',
          boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.15)', zIndex: 9999, minWidth: '340px',
          textAlign: 'left', animation: 'fadeIn 0.3s ease-out'
        }}>
          <p style={{ color: '#99e3d0', fontWeight: '900', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
            Confirmación
          </p>
          <h3 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '1.25rem', fontWeight: 'bold' }}>
            Acción realizada
          </h3>
          <p style={{ margin: 0, color: '#4b5563', fontSize: '0.95rem' }}>{message}</p>
        </div>
      )}
    </>
  )
}

export default MisTurnosView