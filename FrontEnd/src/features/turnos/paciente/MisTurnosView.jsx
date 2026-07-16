import { useState, useEffect, useCallback, useMemo } from 'react'
import { CalendarDays, Clock, ChevronDown, ChevronUp, X } from 'lucide-react'
import { getMisTurnos, cancelarTurno } from '../../../services/turnosService'
import SolicitarTurnoView from './SolicitarTurnoView'
import { getEstadoClass } from '../../../utils/estadoColors'

// Constantes y funciones de formato
const AREA_LABELS = {
  tren_superior: 'Tren Superior',
  tren_medio: 'Tren Medio',
  tren_inferior: 'Tren Inferior'
}

const ESTADO_LABELS = {
  reservado: 'Reservado',
  cancelado: 'Cancelado',
  presente: 'Presente',
  ausente: 'Ausente'
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

function formatDiaLargo(fechaStr) {
  const [anio, mes, dia] = fechaStr.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  const texto = fecha.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Agrupa los turnos por día; dentro de cada día quedan ordenados por horario
// (misma lógica visual que usa la agenda de secretaria/profesional).
function agruparPorDia(turnos) {
  const turnosOrdenados = [...turnos].sort((a, b) =>
    `${a.fecha}${a.hora_inicio}`.localeCompare(`${b.fecha}${b.hora_inicio}`)
  )

  const mapaDias = new Map()
  for (const turno of turnosOrdenados) {
    if (!mapaDias.has(turno.fecha)) {
      mapaDias.set(turno.fecha, { key: turno.fecha, label: formatDiaLargo(turno.fecha), turnos: [] })
    }
    mapaDias.get(turno.fecha).turnos.push(turno)
  }

  return Array.from(mapaDias.values())
}


function MisTurnosView({ user }) {
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  
  // NUEVO ESTADO: Guarda el turno que el paciente tocó para reprogramar
  const [turnoEditando, setTurnoEditando] = useState(null)

  // Extraemos la función afuera para poder recargar la lista cuando reprogramamos con éxito
  const cargarMisTurnos = useCallback(async () => {
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
  }, [user])

  useEffect(() => {
    Promise.resolve().then(cargarMisTurnos)
  }, [cargarMisTurnos])

  const gruposPorDia = useMemo(() => agruparPorDia(turnos), [turnos])

  // Días colapsados manualmente (por defecto todos los días se muestran expandidos)
  const [diasColapsados, setDiasColapsados] = useState(new Set())

  function toggleDia(key) {
    setDiasColapsados((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const [modalCancelar, setModalCancelar] = useState(null) // guarda el turno a cancelar
  
  // Abre el modal con el mensaje correcto según las 48hs
  function abrirModalCancelar(turno) {
    const fechaHoraTurno = new Date(`${turno.fecha}T${turno.hora_inicio}`)
    const ahora = new Date()
    const diffHoras = (fechaHoraTurno - ahora) / (1000 * 60 * 60)
    
    const mensaje = diffHoras >= 48
      ? 'Al cancelar este turno, tendrás un turno a favor para reprogramar cuando quieras ¿Desea continuar?'
      : 'Cancelar con menos de 48 horas de anticipación implica la perdida total de la clase ¿Desea continuar?'

    setModalCancelar({ turno, mensaje })
  }

  async function confirmarCancelar() {
    const turno = modalCancelar.turno
    const turnoId = turno.id
    const fechaHoraTurno = new Date(`${turno.fecha}T${turno.hora_inicio}`)
    const diffHoras = (fechaHoraTurno - new Date()) / (1000 * 60 * 60)
    setModalCancelar(null)
    try {
      await cancelarTurno(user, turnoId)
      setTurnos(turnos.map(t => t.id === turnoId ? { ...t, estado: 'cancelado' } : t))
      const mensajeExito = diffHoras >= 48
        ? 'Turno cancelado con éxito. Tenés un turno a favor para reprogramar cuando quieras.'
        : 'Turno cancelado. Se cobrará la totalidad del turno por cancelación con menos de 48hs de anticipación.'
      setMessage(mensajeExito)
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      alert(err.message || 'No se pudo cancelar el turno.')
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

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {gruposPorDia.map((grupoDia) => {
          const expandido = !diasColapsados.has(grupoDia.key)

          return (
            <div
              key={grupoDia.key}
              style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}
            >
              <button
                type="button"
                onClick={() => toggleDia(grupoDia.key)}
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
                  <CalendarDays size={16} aria-hidden="true" />
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {grupoDia.label}
                  </span>
                  <span style={{
                    background: '#0D4A3A',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '2px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    {grupoDia.turnos.length} {grupoDia.turnos.length === 1 ? 'turno' : 'turnos'}
                  </span>
                </div>
                {expandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {expandido && (
                <div className="turnos-list" style={{ gap: 0 }}>
                  {grupoDia.turnos.map((turno, idx) => (
                    <div
                      key={turno.id}
                      className="turnos-list-item"
                      style={{
                        border: 'none',
                        borderRadius: 0,
                        borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9',
                      }}
                    >
                      <div className="turnos-list-date">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} aria-hidden="true" />
                          {formatTime(turno.hora_inicio)} – {formatTime(turno.hora_fin)}
                        </span>
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
                          <>
                            {/* BOTÓN REPROGRAMAR */}
                            <button
                              type="button"
                              onClick={() => setTurnoEditando(turno)}
                              style={{
                                backgroundColor: '#FEF3C7',
                                color: '#D97706',
                                border: '1px solid #D97706',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.85rem'
                              }}
                            >
                              Reprogramar
                            </button>

                            {/* BOTÓN CANCELAR */}
                            <button
                              type="button"
                              onClick={() => abrirModalCancelar(turno)}
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
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* TOAST FLOTANTE PARA MENSAJES DE ÉXITO */}
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

      {/* MODAL DE REPROGRAMACIÓN (EL PUENTE) */}
      {turnoEditando && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9998,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '20px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#f9fafb', borderRadius: '12px', width: '100%', maxWidth: '850px',
            maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '24px',
            boxShadow: '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Botón para cerrar el modal por si el paciente se arrepiente */}
            <button 
              onClick={() => setTurnoEditando(null)}
              style={{
                position: 'absolute', top: '16px', right: '16px', background: 'none',
                border: 'none', cursor: 'pointer', color: '#6b7280'
              }}
              aria-label="Cerrar modal"
            >
              <X size={24} />
            </button>

            {/* Inyectamos el calendario en Modo Reprogramación */}
            <SolicitarTurnoView 
              user={user} 
              turnoAReprogramar={turnoEditando}
              onSuccess={(msg) => {
                setTurnoEditando(null); // 1. Cerramos el modal oscurecido
                setMessage(msg);        // 2. Disparamos la notificación verde con el mensaje
                setTimeout(() => setMessage(''), 5000);
                cargarMisTurnos();      // 3. Volvemos a pedirle los datos al backend para refrescar la lista
              }}
            />
          </div>
        </div>
      )}
      {/* MODAL DE CANCELACIÓN */}
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
              ¿Cancelar turno?
            </h3>
            <p style={{ color: '#4b5563', marginBottom: '24px' }}>
              {modalCancelar.mensaje}
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
                onClick={confirmarCancelar}
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

export default MisTurnosView
