import { ExternalLink } from 'lucide-react'

function buildAntecedentsText(record) {
  const parts = [
    record.cirugias_relevantes,
    record.enfermedades_relevantes,
    record.medicacion_actual,
    record.alergias,
  ]
    .map((value) => value?.trim())
    .filter(Boolean)

  return parts.join('\n')
}

function MedicalRecordDetail({ record }) {
  const antecedentes = buildAntecedentsText(record)

  return (
    <div className="space-y-5">
      <section>
        <div className="space-y-3">
          <div>
            <strong>Diagnóstico médico</strong>
            <p className="whitespace-pre-line">{record.diagnostico_medico || '-'}</p>
          </div>
        </div>
      </section>

      <section>
        <div className="space-y-3">
          <div>
            <strong>Antecedentes</strong>
            <p className="whitespace-pre-line">{antecedentes || '-'}</p>
          </div>
        </div>
      </section>

      <section>
        <p className="staff-eyebrow">Estudios complementarios</p>

        {!record.estudios?.length ? (
          <p className="staff-empty">No hay estudios complementarios cargados.</p>
        ) : (
          <div className="space-y-3">
            {record.estudios.map((study) => (
              <div
                key={study.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <h4 className="font-semibold">{study.tipo_estudio}</h4>
                <p>
                  <strong>Fecha:</strong> {study.fecha_estudio || '-'}
                </p>
                <p>
                  <strong>Observaciones:</strong> {study.observaciones || '-'}
                </p>
                {study.archivo_url && (
                  <a
                    className="medical-study-file-link mt-3"
                    href={study.archivo_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver PDF
                    <ExternalLink size={15} strokeWidth={2.7} aria-hidden="true" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default MedicalRecordDetail
