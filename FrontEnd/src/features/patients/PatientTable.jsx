import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

function getActionsTrackClass(isOpen) {
  if (isOpen) {
    return 'staff-actions-track open'
  }

  return 'staff-actions-track'
}

function getArrowClass(isOpen) {
  if (isOpen) {
    return 'staff-action-arrow open'
  }

  return 'staff-action-arrow'
}

// CAMBIO 1: Agregamos onAssignTurno a las propiedades que recibe la tabla
function PatientTable({
  items,
  loading,
  currentUserRole,
  onEdit,
  onView,
  onAssignTurno,
  onRoutine,
  onMedicalRecord,
}) {
  const [openPatientId, setOpenPatientId] = useState(null)

  if (loading) {
    return <p className="staff-empty">Cargando pacientes...</p>
  }

  if (!items.length) {
    return <p className="staff-empty">No hay pacientes para mostrar.</p>
  }

  function handleToggleActions(patientId) {
    if (openPatientId === patientId) {
      setOpenPatientId(null)
      return
    }

    setOpenPatientId(patientId)
  }

  function renderPatientActions(patient) {
    if (currentUserRole === 'profesional') {
      return (
        <>
          <button type="button" onClick={() => onRoutine(patient)}>
            Rutina
          </button>

          <button type="button" onClick={() => onMedicalRecord(patient)}>
            Ficha médica
          </button>

          <button type="button" onClick={() => onView(patient)}>
            Ver datos
          </button>
        </>
      )
    }

    return (
      <>
        <button type="button" onClick={() => onAssignTurno(patient)}>
          Asignar turno
        </button>
        <button type="button" onClick={() => onEdit(patient)}>
          Editar
        </button>
        <button type="button" onClick={() => onView(patient)}>
          Ver datos
        </button>
      </>
    )
  }

  function renderRows() {
    const rows = []

    for (const patient of items) {
      const isOpen = openPatientId === patient.id
      const actionsTrackClass = getActionsTrackClass(isOpen)
      const arrowClass = getArrowClass(isOpen)
      let rowClass = ''

      if (isOpen) {
        rowClass = 'staff-card-open'
      }

      rows.push(
        <tr key={patient.id} className={rowClass}>
          <td className="staff-name-cell" data-label="Nombre">
            <strong>
              {patient.nombre} {patient.apellido}
            </strong>
            <span>Paciente</span>
          </td>
          <td className="staff-dni-cell" data-label="DNI">
            {patient.dni}
          </td>
          <td className="staff-email-cell" data-label="Email">
            <span className="staff-email-value">{patient.email}</span>
          </td>
          <td className="staff-actions-cell" data-label="Acciones">
            <div className={actionsTrackClass}>
              {isOpen && (
                <div className="staff-actions-overlay">
                  {renderPatientActions(patient)}
                </div>
              )}

              <button
                type="button"
                className={arrowClass}
                onClick={() => handleToggleActions(patient.id)}
                aria-expanded={isOpen}
                aria-label={`Abrir acciones de ${patient.nombre} ${patient.apellido}`}
              >
                {isOpen ? (
                  <ChevronUp size={20} strokeWidth={3} aria-hidden="true" />
                ) : (
                  <ChevronDown size={20} strokeWidth={3} aria-hidden="true" />
                )}
              </button>
            </div>
          </td>
        </tr>,
      )
    }

    return rows
  }

  return (
    <div className="staff-table-wrap">
      <table className="staff-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>DNI</th>
            <th>Email</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>{renderRows()}</tbody>
      </table>
    </div>
  )
}

export default PatientTable