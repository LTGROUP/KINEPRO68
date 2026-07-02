function MedicalRecordDetail({ record }) {
  return (
    <div className="space-y-5">
      <section>
        <div className="space-y-3">
          <div>
            <strong>Motivo de consulta</strong>
            <p>{record.motivo_consulta || '-'}</p>
          </div>

          <div>
            <strong>Diagnóstico médico</strong>
            <p>{record.diagnostico_medico || '-'}</p>
          </div>

          <div>
            <strong>Zona afectada</strong>
            <p>{record.zona_afectada || '-'}</p>
          </div>

          <div>
            <strong>Inicio lesión o dolor</strong>
            <p>{record.fecha_inicio_lesion || '-'}</p>
          </div>
        </div>
      </section>

      <section>
        <p className="staff-eyebrow">Antecedentes</p>

        <div className="space-y-3">
          <div>
            <strong>Cirugías relevantes</strong>
            <p>{record.cirugias_relevantes || '-'}</p>
          </div>

          <div>
            <strong>Enfermedades relevantes</strong>
            <p>{record.enfermedades_relevantes || '-'}</p>
          </div>

          <div>
            <strong>Medicación actual</strong>
            <p>{record.medicacion_actual || '-'}</p>
          </div>

          <div>
            <strong>Alergias</strong>
            <p>{record.alergias || '-'}</p>
          </div>
        </div>
      </section>

      <section>
        <p className="staff-eyebrow">Información adicional</p>

        <div className="space-y-3">
          <div>
            <strong>Ocupación</strong>
            <p>{record.ocupacion || '-'}</p>
          </div>

          <div>
            <strong>Actividad física</strong>
            <p>{record.actividad_fisica || '-'}</p>
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
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default MedicalRecordDetail
