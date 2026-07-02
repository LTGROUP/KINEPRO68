import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

function createEmptyStudy() {
  return {
    tipo_estudio: '',
    fecha_estudio: '',
    observaciones: '',
    archivo_url: '',
  }
}

function getTodayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function MedicalRecordForm({ loading, onSubmit, initialData = null, mode = 'create' }) {
  const todayInputValue = getTodayInputValue()
  const [form, setForm] = useState(() => ({
    motivo_consulta: initialData?.motivo_consulta || '',
    diagnostico_medico: initialData?.diagnostico_medico || '',
    zona_afectada: initialData?.zona_afectada || '',
    fecha_inicio_lesion: initialData?.fecha_inicio_lesion || '',
    cirugias_relevantes: initialData?.cirugias_relevantes || '',
    enfermedades_relevantes: initialData?.enfermedades_relevantes || '',
    medicacion_actual: initialData?.medicacion_actual || '',
    alergias: initialData?.alergias || '',
    ocupacion: initialData?.ocupacion || '',
    actividad_fisica: initialData?.actividad_fisica || '',
  }))

  const [studies, setStudies] = useState(() => {
    if (!initialData?.estudios?.length) {
      return []
    }

    return initialData.estudios.map((study) => ({
      tipo_estudio: study.tipo_estudio || '',
      fecha_estudio: study.fecha_estudio || '',
      observaciones: study.observaciones || '',
      archivo_url: study.archivo_url || '',
    }))
  })

  function handleInputChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleStudyChange(index, field, value) {
    setStudies((current) => {
      const updated = [...current]

      updated[index] = {
        ...updated[index],
        [field]: value,
      }

      return updated
    })
  }

  function handleAddStudy() {
    setStudies((current) => [...current, createEmptyStudy()])
  }

  function handleRemoveStudy(index) {
    setStudies((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const payload = {
      ...form,
      estudios: studies
        .filter((study) => study.tipo_estudio.trim())
        .map((study) => ({
          tipo_estudio: study.tipo_estudio,
          fecha_estudio: study.fecha_estudio || null,
          observaciones: study.observaciones || null,
          archivo_url: study.archivo_url || null,
        })),
    }

    onSubmit(payload)
  }

  return (
    <form className="auth-form profile-form" onSubmit={handleSubmit}>
      <div>
        <p className="staff-eyebrow">Información médica</p>

        <label className="auth-field">
          <span>Motivo de consulta</span>
          <textarea
            name="motivo_consulta"
            value={form.motivo_consulta}
            onChange={handleInputChange}
            placeholder="Ej: dolor lumbar persistente al realizar actividad física"
            rows="3"
          />
        </label>

        <label className="auth-field">
          <span>Diagnóstico médico</span>
          <input
            type="text"
            name="diagnostico_medico"
            value={form.diagnostico_medico}
            onChange={handleInputChange}
            placeholder="Ej: lumbalgia mecánica"
          />
        </label>

        <label className="auth-field">
          <span>Zona afectada</span>
          <input
            type="text"
            name="zona_afectada"
            value={form.zona_afectada}
            onChange={handleInputChange}
            placeholder="Ej: columna lumbar"
          />
        </label>

        <label className="auth-field">
          <span>Inicio de lesión o dolor</span>
          <input
            type="text"
            name="fecha_inicio_lesion"
            value={form.fecha_inicio_lesion}
            onChange={handleInputChange}
            placeholder="Ej: hace 3 meses / desde 2024 / el año pasado"
          />
        </label>
      </div>

      <div>
        <p className="staff-eyebrow">Antecedentes</p>

        <label className="auth-field">
          <span>Cirugías relevantes</span>
          <textarea
            name="cirugias_relevantes"
            value={form.cirugias_relevantes}
            onChange={handleInputChange}
            placeholder="Ej: cirugía de meniscos en 2022"
            rows="2"
          />
        </label>

        <label className="auth-field">
          <span>Enfermedades relevantes</span>
          <textarea
            name="enfermedades_relevantes"
            value={form.enfermedades_relevantes}
            onChange={handleInputChange}
            placeholder="Ej: hipertensión, diabetes, asma..."
            rows="2"
          />
        </label>

        <label className="auth-field">
          <span>Medicación actual</span>
          <textarea
            name="medicacion_actual"
            value={form.medicacion_actual}
            onChange={handleInputChange}
            placeholder="Ej: ibuprofeno 400mg ocasional"
            rows="2"
          />
        </label>

        <label className="auth-field">
          <span>Alergias</span>
          <textarea
            name="alergias"
            value={form.alergias}
            onChange={handleInputChange}
            placeholder="Ej: penicilina"
            rows="2"
          />
        </label>
      </div>

      <div>
        <p className="staff-eyebrow">Información adicional</p>

        <label className="auth-field">
          <span>Ocupación</span>
          <input
            type="text"
            name="ocupacion"
            value={form.ocupacion}
            onChange={handleInputChange}
            placeholder="Ej: programador, docente, comerciante..."
          />
        </label>

        <label className="auth-field">
          <span>Actividad física</span>
          <input
            type="text"
            name="actividad_fisica"
            value={form.actividad_fisica}
            onChange={handleInputChange}
            placeholder="Ej: gimnasio 3 veces por semana"
          />
        </label>
      </div>

      <div className="mt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="staff-eyebrow">Estudios complementarios</p>
            <h2 className="text-lg font-semibold">Estudios ({studies.length})</h2>
          </div>

          <button type="button" className="staff-register-button" onClick={handleAddStudy}>
            <Plus size={18} strokeWidth={3} aria-hidden="true" />
            Agregar estudio
          </button>
        </div>

        {!studies.length && (
          <p className="staff-empty">Todavía no agregaste estudios complementarios.</p>
        )}

        <div className="space-y-3">
          {studies.map((study, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-800">Estudio {index + 1}</p>

                <button
                  type="button"
                  className="rounded-full p-2 text-red-500 hover:bg-red-50"
                  onClick={() => handleRemoveStudy(index)}
                  aria-label={`Eliminar estudio ${index + 1}`}
                >
                  <Trash2 size={17} strokeWidth={2.6} aria-hidden="true" />
                </button>
              </div>

              <label className="auth-field">
                <span>Tipo de estudio</span>
                <input
                  type="text"
                  value={study.tipo_estudio}
                  onChange={(event) =>
                    handleStudyChange(index, 'tipo_estudio', event.target.value)
                  }
                  placeholder="Ej: radiografía, resonancia, ecografía..."
                  required
                />
              </label>

              <label className="auth-field">
                <span>Fecha del estudio</span>
                <input
                  type="date"
                  value={study.fecha_estudio}
                  max={todayInputValue}
                  onChange={(event) =>
                    handleStudyChange(index, 'fecha_estudio', event.target.value)
                  }
                />
              </label>

              <label className="auth-field">
                <span>Observaciones</span>
                <textarea
                  value={study.observaciones}
                  onChange={(event) =>
                    handleStudyChange(index, 'observaciones', event.target.value)
                  }
                  placeholder="Ej: sin lesiones óseas visibles"
                  rows="2"
                />
              </label>

            </div>
          ))}
        </div>
      </div>

      <button className="auth-submit" type="submit" disabled={loading}>
        {loading
          ? mode === 'edit'
            ? 'Actualizando historia clínica...'
            : 'Guardando historia clínica...'
          : mode === 'edit'
            ? 'Actualizar historia clínica'
            : 'Guardar historia clínica'}
      </button>
    </form>
  )
}

export default MedicalRecordForm
