import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'

import { getMisTurnos } from '../../../services/turnosService'

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
          <span className={getEstadoClass(turno.estado)}>
            {ESTADO_LABELS[turno.estado] || turno.estado}
          </span>
        </div>
      ))}
    </div>
  )
}

export default MisTurnosView
