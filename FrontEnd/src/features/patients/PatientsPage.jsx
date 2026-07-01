import { useEffect, useMemo, useState } from 'react'
import { QrCode, Search, X } from 'lucide-react'

import {
  createPatient,
  getPatientDetail,
  getPatients,
  updatePatient,
} from '../../services/patientService'
import { CheckInQrModal } from '../check-in'
import PatientForm from './PatientForm'
import PatientTable from './PatientTable'
import '../../styles/staff-management.css'
import SolicitarTurnoView from '../turnos/paciente/SolicitarTurnoView' // Ajustá la ruta según tus carpetas

function getSearchButtonClass(searchTerm) {
  if (searchTerm) {
    return 'staff-search-trigger active'
  }

  return 'staff-search-trigger'
}

function getPatientStatusText(patient) {
  if (patient.activo) {
    return 'Activo'
  }

  return 'Inactivo'
}

function getFeedbackCardClass(error) {
  if (error) {
    return 'staff-feedback-card error'
  }

  return 'staff-feedback-card success'
}

function getFeedbackEyebrow(error) {
  if (error) {
    return 'Error'
  }

  return 'Confirmacion'
}

function getFeedbackTitle(error) {
  if (error) {
    return 'No se pudo completar la accion'
  }

  return 'Accion realizada'
}

function PatientsPage({ user, onSectionChange, onNavigateToTurnos }) {
  const [items, setItems] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [editingPatient, setEditingPatient] = useState(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [patientForTurno, setPatientForTurno] = useState(null)

  const filteredItems = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    if (!search) {
      return items
    }

    const result = []

    for (const patient of items) {
      const searchableText = `${patient.nombre} ${patient.apellido} ${patient.dni} ${patient.email}`
      const normalizedText = searchableText.toLowerCase()

      if (normalizedText.includes(search)) {
        result.push(patient)
      }
    }

    return result
  }, [items, searchTerm])

  async function loadPatients() {
    setLoading(true)
    setError('')

    try {
      const response = await getPatients(user, { includeInactive: false })
      setItems(response.items)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(loadPatients)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!message) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setMessage('')
    }, 5000)

    return () => window.clearTimeout(timeoutId)
  }, [message])

  useEffect(() => {
    if (!error) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setError('')
    }, 5000)

    return () => window.clearTimeout(timeoutId)
  }, [error])

  async function handleView(patient) {
    setError('')
    setMessage('')

    try {
      const detail = await getPatientDetail(user, patient.id)
      setSelectedPatient(detail)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleEdit(patient) {
    setError('')
    setMessage('')

    try {
      const detail = await getPatientDetail(user, patient.id)
      setEditingPatient(detail)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function handleAssignTurno(patient) {
    setPatientForTurno(patient)
  }

  async function handleCreatePatient(payload) {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const createdPatient = await createPatient(user, payload)
      setMessage(
        `Se registró al paciente ${createdPatient.nombre} ${createdPatient.apellido} correctamente, se envió un mail de confirmación al mail correspondiente.`,
      )
      setShowRegisterModal(false)
      await loadPatients()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdatePatient(payload) {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const updatedPatient = await updatePatient(user, editingPatient.id, payload)
      setMessage(`${updatedPatient.nombre} ${updatedPatient.apellido} fue actualizado correctamente.`)
      setEditingPatient(null)
      await loadPatients()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  function handleOpenSearch() {
    setShowSearch(true)
  }

  function handleCloseSearch() {
    setSearchTerm('')
    setShowSearch(false)
  }

  function handleOpenRegisterModal() {
    setError('')
    setMessage('')
    setShowRegisterModal(true)
  }

  function handleOpenQrModal() {
    setShowQrModal(true)
  }

  function handleCloseQrModal() {
    setShowQrModal(false)
  }

  return (
    <main className="staff-page">
      <section className="staff-shell" aria-labelledby="patients-title">
        <section className="staff-panel" aria-label="Listado de pacientes">
          <div className="staff-panel-header">
            <div>
              <h1 id="patients-title">Pacientes</h1>
              <p>{filteredItems.length} pacientes encontrados</p>
            </div>
          </div>

          <div className="staff-tools">
            <div className="staff-filters patient-tools-row" aria-label="Herramientas de pacientes">
              <div className="staff-filter-left">
                <button
                  type="button"
                  className={getSearchButtonClass(searchTerm)}
                  onClick={handleOpenSearch}
                  aria-label="Buscar paciente"
                >
                  <Search size={18} strokeWidth={3} aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                className="staff-qr-button"
                onClick={handleOpenQrModal}
              >
                <QrCode size={18} strokeWidth={3} aria-hidden="true" />
                Mostrar QR
              </button>

              <button
                type="button"
                className="staff-register-button"
                onClick={handleOpenRegisterModal}
              >
                Registrar paciente
              </button>
            </div>

            {showSearch && (
              <div className="staff-search-overlay">
                <label className="staff-search" aria-label="Buscar paciente">
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Nombre, DNI o email"
                    autoFocus
                  />
                </label>
                <button
                  type="button"
                  className="staff-search-close"
                  aria-label="Cerrar busqueda"
                  onClick={handleCloseSearch}
                >
                  <X size={18} strokeWidth={3} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          <PatientTable
            items={filteredItems}
            loading={loading}
            onEdit={handleEdit}
            onView={handleView}
            onAssignTurno={handleAssignTurno}
          />
        </section>
      </section>

      {selectedPatient && (
        <aside className="staff-detail" aria-label="Detalle del paciente">
          <div className="staff-detail-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setSelectedPatient(null)}
              aria-label="Cerrar detalle"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>
            <p className="staff-eyebrow">Paciente</p>
            <h2>
              {selectedPatient.nombre} {selectedPatient.apellido}
            </h2>
            <dl>
              <div>
                <dt>DNI</dt>
                <dd>{selectedPatient.dni}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{selectedPatient.email}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{selectedPatient.telefono}</dd>
              </div>
              <div>
                <dt>Obra social</dt>
                <dd>{selectedPatient.obra_social}</dd>
              </div>
              <div>
                <dt>Fecha de nacimiento</dt>
                <dd>{selectedPatient.fecha_nacimiento}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{getPatientStatusText(selectedPatient)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      )}

      {showRegisterModal && (
        <aside className="staff-detail" aria-label="Registrar paciente">
          <div className="staff-detail-card staff-form-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setShowRegisterModal(false)}
              aria-label="Cerrar registro de paciente"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>
            <p className="staff-eyebrow">Nuevo paciente</p>
            <h2>Registrar paciente</h2>
            <PatientForm loading={saving} onSubmit={handleCreatePatient} />
          </div>
        </aside>
      )}

      {editingPatient && (
        <aside className="staff-detail" aria-label="Editar paciente">
          <div className="staff-detail-card staff-form-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setEditingPatient(null)}
              aria-label="Cerrar edicion de paciente"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>
            <p className="staff-eyebrow">Editar paciente</p>
            <h2>
              {editingPatient.nombre} {editingPatient.apellido}
            </h2>
            <PatientForm
              initialData={editingPatient}
              loading={saving}
              mode="edit"
              onSubmit={handleUpdatePatient}
            />
          </div>
        </aside>
      )}

      {showQrModal && <CheckInQrModal onClose={handleCloseQrModal} />}
      {patientForTurno && (
        <aside className="staff-detail" aria-label="Asignar turno manual">
          <div className="staff-detail-card" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setPatientForTurno(null)}
              aria-label="Cerrar asignación de turno"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>
            <p className="staff-eyebrow">Asignación manual</p>
            <h2>Turno para {patientForTurno.nombre}</h2>

            <SolicitarTurnoView
              user={user}
              targetPatient={patientForTurno}
              onSuccess={(msg, tabDestino, seccionDestino) => {
                setMessage(msg)
                setPatientForTurno(null)
                if (tabDestino && onNavigateToTurnos) {
                  onNavigateToTurnos(tabDestino) // navega a turnos y abre el tab pedido (ej: lista-espera)
                } else if (seccionDestino && onSectionChange) {
                  onSectionChange(seccionDestino)
                }
              }}
            />
          </div>
        </aside>
      )}
      {(error || message) && (
        <aside className="staff-feedback" aria-label="Resultado de la accion">
          <div className={getFeedbackCardClass(error)} role="alert">
            <p className="staff-eyebrow">{getFeedbackEyebrow(error)}</p>
            <h2>{getFeedbackTitle(error)}</h2>
            <p>{error || message}</p>
          </div>
        </aside>
      )}
    </main>
  )
}

export default PatientsPage
