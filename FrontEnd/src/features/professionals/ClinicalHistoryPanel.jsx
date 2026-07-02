import { useState } from 'react'

const initialFormValues = {
  actividad_realizada: '',
  evolucion: '',
}

function formatSessionDate(value) {
  if (!value) {
    return '-'
  }

  const [year, month, day] = value.split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}

function ClinicalHistoryPanel({
  notes,
  loading,
  saving,
  onRegister,
}) {
  const [showForm, setShowForm] = useState(false)
  const [values, setValues] = useState(initialFormValues)
  const [formError, setFormError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setFormError('')

    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!values.actividad_realizada.trim() || !values.evolucion.trim()) {
      setFormError('Debe completar ambos campos para poder registrar la sesión')
      return
    }

    await onRegister(values)
    setValues(initialFormValues)
    setFormError('')
    setShowForm(false)
  }

  return (
    <div className="clinical-history">
      <div className="clinical-history-header">
        <div className="clinical-history-title-row">
          <h2>Registro de sesiones</h2>
          <button
            type="button"
            className="clinical-history-add-button"
            onClick={() => setShowForm((currentValue) => !currentValue)}
            aria-label={showForm ? 'Ocultar registro de sesión' : 'Registrar sesión'}
          >
            +
          </button>
        </div>

      </div>

      {showForm && (
        <form className="clinical-history-form" onSubmit={handleSubmit}>
          <div className="clinical-history-today">
            <strong>Fecha de sesión</strong>
            <span>{formatSessionDate(new Date().toISOString().slice(0, 10))}</span>
          </div>

          <label>
            <span>
              Qué se hizo en la sesión <span className="required-marker">(*)</span>
            </span>
            <textarea
              name="actividad_realizada"
              value={values.actividad_realizada}
              onChange={handleChange}
              rows="4"
            />
          </label>

          <label>
            <span>
              Evolución del paciente <span className="required-marker">(*)</span>
            </span>
            <textarea
              name="evolucion"
              value={values.evolucion}
              onChange={handleChange}
              rows="4"
            />
          </label>

          {formError ? (
            <p className="clinical-history-form-error">{formError}</p>
          ) : null}

          <button type="submit" className="staff-register-button" disabled={saving}>
            {saving ? 'Registrando...' : 'Guardar sesión'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="staff-empty">Cargando sesiones...</p>
      ) : null}

      {!loading && !notes.length ? (
        <p className="staff-empty">Todavía no hay sesiones registradas para este paciente.</p>
      ) : null}

      {!loading && notes.length ? (
        <div className="clinical-history-list">
          {notes.map((note) => (
            <article key={note.id} className="clinical-history-note">
              <div className="clinical-history-note-header">
                <div>
                  <strong>{formatSessionDate(note.fecha_sesion)}</strong>
                  <span>{note.profesional_nombre}</span>
                </div>
              </div>

              <div>
                <h3>Actividad realizada</h3>
                <p>{note.actividad_realizada}</p>
              </div>

              <div>
                <h3>Evolución</h3>
                <p>{note.evolucion}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default ClinicalHistoryPanel
