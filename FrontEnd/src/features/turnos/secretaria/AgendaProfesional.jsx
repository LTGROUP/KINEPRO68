import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Clock, UserCheck, UserX, CalendarX, Filter, Search, X } from 'lucide-react'

import { getAgendaDia, actualizarEstadoTurno, cancelarTurnoSecretaria } from '../../../services/turnosService'
import { getEstadoClass } from '../../../utils/estadoColors'

// Misma regla de negocio que usa el backend para decidir la penalidad (HU-14).
// `diaTurno` es el Date del día de agenda que se está viendo; el turno en sí
// no trae su propia fecha (AgendaTurnoResponse solo tiene hora_inicio/hora_fin).
function esMenosDe48hs(diaTurno, horaInicioStr) {
  const [h, m] = horaInicioStr.split(':').map(Number)
  const fechaHoraTurno = new Date(diaTurno)
  fechaHoraTurno.setHours(h, m, 0, 0)

  const limite = new Date()
  limite.setHours(limite.getHours() + 48)
  return fechaHoraTurno < limite
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

function normalizar(texto) {
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

export function AgendaProfesional({ user }) {
  const [fecha, setFecha] = useState(new Date())
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // NUEVOS ESTADOS PARA EL FILTRO
  const [areaFiltro, setAreaFiltro] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  // Buscador por nombre/DNI
  const [busqueda, setBusqueda] = useState('')

  // Grupos por horario expandidos manualmente (colapsado por defecto)
  const [gruposExpandidos, setGruposExpandidos] = useState(new Set())

  // Modal de confirmación para cancelar turno (HU-14)
  const [modalCancelarTurno, setModalCancelarTurno] = useState(null)
  const [cancelando, setCancelando] = useState(false)

  async function cargarAgenda() {
    setLoading(true)
    setError('')
    setMessage('')
    setTurnos([])

    try {
      const fechaStr = fecha.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
      const data = await getAgendaDia(user, fechaStr, areaFiltro)
      setTurnos(data.turnos || [])
    } catch (err) {
      setError(err.message || 'Error al cargar la agenda.')
    } finally {
      setLoading(false)
    }
  }

  // ACTUALIZADO: Agregamos areaFiltro a las dependencias y a la llamada
  useEffect(() => {
    async function ejecutar() {
      await cargarAgenda()
    }
    ejecutar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, user, areaFiltro])

  // Al cambiar de día se resetean los grupos expandidos manualmente y la búsqueda
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

  const busquedaNormalizada = normalizar(busqueda.trim())

  const turnosFiltrados = useMemo(
    () => turnos.filter((t) => turnoCoincideBusqueda(t, busquedaNormalizada)),
    [turnos, busquedaNormalizada]
  )

  // Agrupación por horario (hora_inicio - hora_fin)
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

  async function marcarPresente(id) {
    setError('')
    setMessage('')
    try {
      await actualizarEstadoTurno(user, id, { nuevo_estado: 'presente' })

      setTurnos((prev) => prev.map((t) =>
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

  async function marcarAusente(id) {
    setError('')
    setMessage('')
    try {
      await actualizarEstadoTurno(user, id, { nuevo_estado: 'ausente' })

      setTurnos((prev) => prev.map((t) =>
        t.id === id ? { ...t, estado: 'ausente' } : t
      ))

      setMessage('El turno fue registrado como ausencia.')
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      console.error("No se pudo registrar la ausencia", err)
      setError("No se pudo actualizar el estado. Verificá la conexión.")
      setTimeout(() => setError(''), 5000)
    }
  }

  function abrirModalCancelarTurno(turno) {
    setModalCancelarTurno(turno)
  }

  function cerrarModalCancelarTurno() {
    if (cancelando) return
    setModalCancelarTurno(null)
  }

  async function confirmarCancelarTurno() {
    if (!modalCancelarTurno) return
    const turnoId = modalCancelarTurno.id

    setCancelando(true)
    setError('')
    setMessage('')

    try {
      const data = await cancelarTurnoSecretaria(user, turnoId)
      setModalCancelarTurno(null)
      setMessage(data.mensaje || 'Turno cancelado con éxito.')
      setTimeout(() => setMessage(''), 5000)
      await cargarAgenda()
    } catch (err) {
      console.error('No se pudo cancelar el turno', err)
      setError(err.message || 'No se pudo cancelar el turno. Verificá la conexión.')
      setTimeout(() => setError(''), 5000)
    } finally {
      setCancelando(false)
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

        {/* FILA DE FILTRO + BÚSQUEDA, dentro del mismo card blanco */}
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

          {!loading && !error && turnos.length > 0 && (
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
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
            {areaFiltro ? 'No hay turnos agendados para esta área hoy.' : 'No hay turnos agendados para este día.'}
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
                              {turno.paciente ? `${turno.paciente.nombre} ${turno.paciente.apellido}` : 'Sin datos del paciente'}
                            </strong>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                              Tratamiento: {turno.area_tratamiento ? turno.area_tratamiento.replace('_', ' ') : 'General'}
                            </span>
                          </div>

                          <span className={getEstadoClass(turno.estado)}>
                            {turno.estado.charAt(0).toUpperCase() + turno.estado.slice(1)}
                          </span>

                          {turno.estado === 'reservado' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {esHoy && (
                                <>
                                  <button
                                    type="button"
                                    className="turnos-agenda-action"
                                    onClick={() => marcarPresente(turno.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                  >
                                    <UserCheck size={16} />
                                    Dar Presente
                                  </button>
                                  <button
                                    type="button"
                                    className="turnos-agenda-action"
                                    onClick={() => marcarAusente(turno.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#b91c1c', border: '1px solid #b91c1c' }}
                                  >
                                    <UserX size={16} />
                                    Registrar Ausencia
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                className="turnos-agenda-action"
                                onClick={() => abrirModalCancelarTurno(turno)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#6b7280', border: '1px solid #d1d5db' }}
                              >
                                <CalendarX size={16} />
                                Cancelar turno
                              </button>
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

      {/* MODAL DE CONFIRMACIÓN — cancelar turno (HU-14), con aviso de penalidad */}
      {modalCancelarTurno && (
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
            <p style={{ color: '#4b5563', marginBottom: '16px' }}>
              {`¿Confirmás cancelar el turno de ${modalCancelarTurno.paciente
                ? `${modalCancelarTurno.paciente.nombre} ${modalCancelarTurno.paciente.apellido}`
                : 'este paciente'} de ${formatTime(modalCancelarTurno.hora_inicio)} a ${formatTime(modalCancelarTurno.hora_fin)}?`}
            </p>

            {esMenosDe48hs(fecha, modalCancelarTurno.hora_inicio) ? (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
                padding: '12px 14px', marginBottom: '24px', color: '#b91c1c', fontSize: '0.875rem',
              }}>
                Se cancela con menos de 48hs de anticipación: se cobrará la totalidad del turno por penalidad.
              </div>
            ) : (
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
                padding: '12px 14px', marginBottom: '24px', color: '#065f46', fontSize: '0.875rem',
              }}>
                Faltan más de 48hs para el turno: se cancela sin penalidad.
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={cerrarModalCancelarTurno}
                disabled={cancelando}
                style={{
                  padding: '8px 20px', borderRadius: '6px', border: '1px solid #d1d5db',
                  background: 'white', cursor: cancelando ? 'not-allowed' : 'pointer', fontWeight: 'bold'
                }}
              >
                Volver
              </button>
              <button
                onClick={confirmarCancelarTurno}
                disabled={cancelando}
                style={{
                  padding: '8px 20px', borderRadius: '6px', border: 'none',
                  background: '#b91c1c', color: 'white', cursor: cancelando ? 'not-allowed' : 'pointer', fontWeight: 'bold'
                }}
              >
                {cancelando ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
