import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

function formatRole(role) {
  const labels = {
    administrativo: 'Administrativo',
    profesional: 'Profesional',
    secretaria: 'Secretaria',
  }

  if (labels[role]) {
    return labels[role]
  }

  return role
}

function getStaffRowClass(staff, isOpen) {
  let rowClass = ''

  if (!staff.activo) {
    rowClass = 'inactive'
  }

  if (isOpen) {
    if (rowClass) {
      rowClass = `${rowClass} staff-card-open`
    } else {
      rowClass = 'staff-card-open'
    }
  }

  return rowClass
}

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

function StaffTable({ items, loading, currentUserId, onEdit, onView, onDeactivate }) {
  const [openStaffId, setOpenStaffId] = useState(null)

  if (loading) {
    return <p className="staff-empty">Cargando personal...</p>
  }

  if (!items.length) {
    return <p className="staff-empty">No hay personal para mostrar.</p>
  }

  function handleToggleActions(staffId) {
    if (openStaffId === staffId) {
      setOpenStaffId(null)
      return
    }

    setOpenStaffId(staffId)
  }

  function renderRows() {
    const rows = []

    for (const staff of items) {
      const isOpen = openStaffId === staff.id
      const isCurrentUser = staff.id === currentUserId
      const rowClass = getStaffRowClass(staff, isOpen)
      const actionsTrackClass = getActionsTrackClass(isOpen)
      const arrowClass = getArrowClass(isOpen)
      let deactivateTitle

      if (isCurrentUser) {
        deactivateTitle = 'No podes darte de baja a vos mismo'
      }

      rows.push(
        <tr key={staff.id} className={rowClass}>
          <td className="staff-name-cell" data-label="Nombre">
            <strong>
              {staff.nombre} {staff.apellido}
            </strong>
            <span>{formatRole(staff.rol)}</span>
          </td>
          <td className="staff-dni-cell" data-label="DNI">
            {staff.dni}
          </td>
          <td className="staff-email-cell" data-label="Email">
            <span className="staff-email-value">{staff.email}</span>
          </td>
          <td className="staff-actions-cell" data-label="Acciones">
            <div className={actionsTrackClass}>
              {isOpen && (
                <div className="staff-actions-overlay">
                  <button type="button" onClick={() => onEdit(staff)}>
                    Editar
                  </button>
                  <button type="button" onClick={() => onView(staff)}>
                    Ver datos
                  </button>
                  <button
                    type="button"
                    className="staff-action-danger"
                    disabled={!staff.activo || isCurrentUser}
                    onClick={() => onDeactivate(staff)}
                    title={deactivateTitle}
                  >
                    Dar de baja
                  </button>
                </div>
              )}

              <button
                type="button"
                className={arrowClass}
                onClick={() => handleToggleActions(staff.id)}
                aria-expanded={isOpen}
                aria-label={`Abrir acciones de ${staff.nombre} ${staff.apellido}`}
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

export default StaffTable
