import { useState } from 'react'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'

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

function buildAntecedentsText(initialData) {
  if (!initialData) {
    return ''
  }

  const parts = [
    initialData.cirugias_relevantes,
    initialData.enfermedades_relevantes,
    initialData.medicacion_actual,
    initialData.alergias,
  ]
    .map((value) => value?.trim())
    .filter(Boolean)

  return parts.join('\n')
}

function MedicalRecordForm({
  actor,
  loading,
  onSubmit,
  onUploadStudyPdf,
  initialData = null,
  mode = 'create',
}) {
  const todayInputValue = getTodayInputValue()
  const [uploadingStudyIndex, setUploadingStudyIndex] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [form, setForm] = useState(() => ({
    diagnostico_medico: initialData?.diagnostico_medico || '',
    antecedentes: buildAntecedentsText(initialData),
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

  async function handleStudyPdfChange(index, file) {
    if (!file || !onUploadStudyPdf) {
      return
    }

    setUploadError('')
    setUploadingStudyIndex(index)

    try {
      const response = await onUploadStudyPdf(actor, file)
      handleStudyChange(index, 'archivo_url', response.archivo_url)
    } catch (error) {
      setUploadError(error.message)
    } finally {
      setUploadingStudyIndex(null)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()

    const payload = {
      motivo_consulta: null,
      diagnostico_medico: form.diagnostico_medico,
      zona_afectada: null,
      fecha_inicio_lesion: null,
      cirugias_relevantes: form.antecedentes,
      enfermedades_relevantes: null,
      medicacion_actual: null,
      alergias: null,
      ocupacion: null,
      actividad_fisica: null,
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
          <span>Diagnóstico médico</span>
          <textarea
            name="diagnostico_medico"
            value={form.diagnostico_medico}
            onChange={handleInputChange}
            placeholder="Ej: lumbalgia mecánica, tendinitis, esguince..."
            rows="4"
          />
        </label>
      </div>

      <div>
        <p className="staff-eyebrow">Antecedentes</p>

        <label className="auth-field">
          <span>Antecedentes</span>
          <textarea
            name="antecedentes"
            value={form.antecedentes}
            onChange={handleInputChange}
            placeholder="Ej: cirugías, enfermedades relevantes, medicación actual, alergias u otros datos importantes"
            rows="5"
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

              <div className="medical-study-file-row">
                <label className="medical-study-file-button">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) =>
                      handleStudyPdfChange(index, event.target.files?.[0])
                    }
                    disabled={uploadingStudyIndex === index}
                  />
                  {uploadingStudyIndex === index ? 'Subiendo PDF...' : 'Adjuntar PDF'}
                </label>

                {study.archivo_url && (
                  <a
                    className="medical-study-file-link"
                    href={study.archivo_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver PDF
                    <ExternalLink size={15} strokeWidth={2.7} aria-hidden="true" />
                  </a>
                )}
              </div>

            </div>
          ))}
        </div>

        {uploadError && <p className="staff-inline-error">{uploadError}</p>}
      </div>

      <button className="auth-submit" type="submit" disabled={loading || uploadingStudyIndex !== null}>
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
