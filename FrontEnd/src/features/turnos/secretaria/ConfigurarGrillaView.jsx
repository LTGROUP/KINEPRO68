import { useState } from 'react'
import { Plus, X } from 'lucide-react'

import { generarGrilla } from '../../../services/turnosService'

const DIAS_OPTIONS = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
]

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function getDefaultAnio() {
  return new Date().getFullYear()
}

function getDefaultMes() {
  return new Date().getMonth() + 1
}

function ConfigurarGrillaView({ user, onSuccess }) {
  const [mes, setMes] = useState(getDefaultMes())
  const [anio, setAnio] = useState(getDefaultAnio())
  const [turnos_por_slot, setTurnosPorSlot] = useState(1)
  const [diasHabiles, setDiasHabiles] = useState(['lunes', 'martes', 'miercoles', 'jueves', 'viernes'])
  const [franjas, setFranjas] = useState([{ hora_inicio: '08:00', hora_fin: '12:00' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)

  function toggleDia(dia) {
    setDiasHabiles((prev) => {
      if (prev.includes(dia)) {
        return prev.filter((d) => d !== dia)
      }
      return [...prev, dia]
    })
  }

  function handleFranjaChange(index, field, value) {
    setFranjas((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addFranja() {
    setFranjas((prev) => [...prev, { hora_inicio: '14:00', hora_fin: '18:00' }])
  }

  function removeFranja(index) {
    setFranjas((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setResultado(null)

    if (diasHabiles.length === 0) {
      setError('Seleccioná al menos un día hábil.')
      return
    }

    if (franjas.length === 0) {
      setError('Agregá al menos una franja horaria.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        mes: Number(mes),
        anio: Number(anio),
        turnos_por_slot: Number(turnos_por_slot),
        dias_habiles: diasHabiles,
        franjas: franjas.map((f) => ({
          hora_inicio: f.hora_inicio,
          hora_fin: f.hora_fin,
        })),
        dias_cerrados: [],
      }

      const data = await generarGrilla(user, payload)
      setResultado(data)

      if (onSuccess) {
        onSuccess(data.mensaje || 'Grilla generada correctamente.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="staff-member-form" onSubmit={handleSubmit} noValidate>
      <fieldset className="staff-form-fields">
        <legend className="sr-only">Período</legend>

        <div className="staff-form-field">
          <label htmlFor="grilla-mes">Mes</label>
          <select
            id="grilla-mes"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            required
          >
            {MESES.map((label, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="staff-form-field">
          <label htmlFor="grilla-anio">Año</label>
          <input
            id="grilla-anio"
            type="number"
            value={anio}
            min={new Date().getFullYear()}
            max={new Date().getFullYear() + 2}
            onChange={(e) => setAnio(e.target.value)}
            required
          />
        </div>

        <div className="staff-form-field">
          <label htmlFor="grilla-turnos">Cupos por turno</label>
          <input
            id="grilla-turnos"
            type="number"
            value={turnos_por_slot}
            min={1}
            max={20}
            onChange={(e) => setTurnosPorSlot(e.target.value)}
            required
          />
        </div>
      </fieldset>

      <div className="staff-form-field full" role="group" aria-labelledby="dias-label">
        <span id="dias-label">Días hábiles</span>
        <div className="turnos-dias-grid">
          {DIAS_OPTIONS.map((dia) => (
            <button
              key={dia.value}
              type="button"
              className={`turnos-dia-option${diasHabiles.includes(dia.value) ? ' active' : ''}`}
              onClick={() => toggleDia(dia.value)}
              aria-pressed={diasHabiles.includes(dia.value)}
            >
              {dia.label}
            </button>
          ))}
        </div>
      </div>

      <div className="staff-form-field full" role="group" aria-labelledby="franjas-label">
        <span id="franjas-label">Franjas horarias</span>

        {franjas.map((franja, index) => (
          <div key={index} className="turnos-franja-row">
            <div className="staff-form-field">
              <label htmlFor={`franja-inicio-${index}`}>Inicio</label>
              <input
                id={`franja-inicio-${index}`}
                type="time"
                value={franja.hora_inicio}
                onChange={(e) => handleFranjaChange(index, 'hora_inicio', e.target.value)}
                required
              />
            </div>
            <div className="staff-form-field">
              <label htmlFor={`franja-fin-${index}`}>Fin</label>
              <input
                id={`franja-fin-${index}`}
                type="time"
                value={franja.hora_fin}
                onChange={(e) => handleFranjaChange(index, 'hora_fin', e.target.value)}
                required
              />
            </div>
            {franjas.length > 1 && (
              <button
                type="button"
                className="turnos-franja-remove"
                onClick={() => removeFranja(index)}
                aria-label={`Eliminar franja ${index + 1}`}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          className="turnos-add-franja"
          onClick={addFranja}
        >
          <Plus size={16} aria-hidden="true" />
          Agregar franja
        </button>
      </div>

      {error && (
        <p className="staff-message error">{error}</p>
      )}

      {resultado && (
        <div className="staff-message success">
          <strong>{resultado.mensaje}</strong>
          <br />
          {resultado.total_turnos_creados} turnos creados para {MESES[resultado.mes - 1]} {resultado.anio}.
          {resultado.dias_omitidos?.length > 0 && (
            <span> Días omitidos: {resultado.dias_omitidos.join(', ')}.</span>
          )}
        </div>
      )}

      <button
        type="submit"
        className="staff-form-submit"
        disabled={saving}
      >
        {saving ? 'Generando...' : 'Generar grilla'}
      </button>
    </form>
  )
}

export default ConfigurarGrillaView
