import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, QrCode, Search, X } from 'lucide-react'

import RoutineForm from '../professionals/RoutineForm'
import {
  createPatient,
  getPatientDetail,
  getPatients,
  updatePatient,
} from '../../services/patientService'
import {
  createRoutine,
  deleteRoutine,
  getPatientRoutine,
  updateRoutine,
} from '../../services/routineService'
import { CheckInQrModal } from '../check-in'
import PatientForm from './PatientForm'
import PatientTable from './PatientTable'
import '../../styles/staff-management.css'
import SolicitarTurnoView from '../turnos/paciente/SolicitarTurnoView'
import MedicalRecordForm from '../professionals/MedicalRecordForm'
import {
  createMedicalRecord,
  getMedicalRecord,
  updateMedicalRecord,
  downloadMedicalRecordPdf,
  uploadStudyPdf,
} from '../../services/medicalRecordService'
import {
  createSessionNote,
  getPatientSessionNotes,
} from '../../services/sessionNoteService'

import MedicalRecordDetail from '../professionals/MedicalRecordDetail'
import ClinicalHistoryPanel from '../professionals/ClinicalHistoryPanel'
import RoutineDetailModal from '../professionals/RoutineDetailModal'

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

function PatientsPage({ user, onSectionChange, onNavegarATurnos }) {
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
  const [selectedRoutine, setSelectedRoutine] = useState(null)
  const [patientForRoutine, setPatientForRoutine] = useState(null)
  const [savingRoutine, setSavingRoutine] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState(null)
  const [deletingRoutine, setDeletingRoutine] = useState(false)
  const [patientForMedicalRecord, setPatientForMedicalRecord] = useState(null)
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState(null)
  const [showMedicalRecordActions, setShowMedicalRecordActions] = useState(false)
  const [patientForSessionNotes, setPatientForSessionNotes] = useState(null)
  const [clinicalHistoryNotes, setClinicalHistoryNotes] = useState([])
  const [loadingClinicalHistory, setLoadingClinicalHistory] = useState(false)
  const [savingSessionNote, setSavingSessionNote] = useState(false)
  const [editingMedicalRecord, setEditingMedicalRecord] = useState(null)
  const [savingMedicalRecord, setSavingMedicalRecord] = useState(false)
  const [patientWithoutRoutine, setPatientWithoutRoutine] = useState(null)
  const [patientWithoutMedicalRecord, setPatientWithoutMedicalRecord] = useState(null)
  const canManagePatients = user.rol === 'administrativo' || user.rol === 'secretaria'
  const ownsSelectedRoutine = Boolean(
    selectedRoutine && selectedRoutine.profesional_id === user.user_id,
  )
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

  async function handleRoutine(patient) {
    setError('')
    setMessage('')

    try {
      const routine = await getPatientRoutine(user, patient.id)
      setSelectedRoutine(routine)
    } catch (requestError) {
      if (requestError.status === 404) {
        setPatientWithoutRoutine(patient)
      } else {
        setError(requestError.message)
      }
    }
  }

  async function handleMedicalRecordAction(patient) {
    setError('')
    setMessage('')

    try {
      const record = await getMedicalRecord(user, patient.id)
      setSelectedMedicalRecord(record)
      setShowMedicalRecordActions(false)
    } catch (requestError) {
      if (requestError.status === 404) {
        setPatientWithoutMedicalRecord(patient)
      } else {
        setError(requestError.message)
      }
    }
  }

  async function handleSessionRecordAction(patient) {
    setError('')
    setMessage('')
    setPatientForSessionNotes(patient)
    setClinicalHistoryNotes([])
    await loadClinicalHistory(patient.id)
  }

  async function handleCreateMedicalRecord(payload) {
    setSavingMedicalRecord(true)

    try {
      await createMedicalRecord(user, {
        ...payload,
        paciente_id: patientForMedicalRecord.id,
      })

      setMessage('Historia clínica creada correctamente')
      setPatientForMedicalRecord(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingMedicalRecord(false)
    }
  }

  async function handleUpdateMedicalRecord(payload) {
    setSavingMedicalRecord(true)

    try {
      await updateMedicalRecord(
        user,
        editingMedicalRecord.id,
        payload,
      )

      setMessage('Historia clínica actualizada correctamente')
      setEditingMedicalRecord(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingMedicalRecord(false)
    }
  }

  async function handleDownloadMedicalRecordPdf(record) {
    try {
      await downloadMedicalRecordPdf(user, record.id)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function loadClinicalHistory(patientId) {
    setLoadingClinicalHistory(true)

    try {
      const response = await getPatientSessionNotes(user, patientId)
      setClinicalHistoryNotes(response.items)
    } catch (requestError) {
      setError(requestError.message)
      setClinicalHistoryNotes([])
    } finally {
      setLoadingClinicalHistory(false)
    }
  }

  async function handleRegisterSessionNote(payload) {
    setSavingSessionNote(true)
    setError('')
    setMessage('')

    try {
      const createdNote = await createSessionNote(user, {
        ...payload,
        paciente_id: patientForSessionNotes.id,
      })

      setClinicalHistoryNotes((currentNotes) => [createdNote, ...currentNotes])
      setMessage('Anotacion guardada con exito')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingSessionNote(false)
    }
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

  async function handleSubmitRoutine(payload) {
    setSavingRoutine(true)
    setError('')
    setMessage('')
    try {
      await createRoutine(user, payload)
      setMessage(`Rutina asignada a ${patientForRoutine.nombre} ${patientForRoutine.apellido}`)
      setPatientForRoutine(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingRoutine(false)
    }
  }

  function handleOpenEditRoutine() {
    setEditingRoutine(selectedRoutine)
    setSelectedRoutine(null)
  }

  async function handleUpdateRoutine(payload) {
    setSavingRoutine(true)
    setError('')
    setMessage('')

    try {
      await updateRoutine(user, editingRoutine.id, payload)

      setMessage('Rutina actualizada correctamente')
      setEditingRoutine(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingRoutine(false)
    }
  }

  async function handleDeleteRoutine() {
    if (!selectedRoutine || deletingRoutine) return

    setDeletingRoutine(true)
    setError('')
    setMessage('')

    try {
      await deleteRoutine(user, selectedRoutine.id)

      setMessage('Rutina eliminada correctamente')
      setSelectedRoutine(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setDeletingRoutine(false)
    }
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

              {canManagePatients && (
                <>
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
                </>
              )}
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
            currentUserRole={user.rol}
            onEdit={handleEdit}
            onView={handleView}
            onAssignTurno={handleAssignTurno}
            onRoutine={handleRoutine}
            onMedicalRecord={handleMedicalRecordAction}
            onSessionRecord={handleSessionRecordAction}
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

      {patientForRoutine && (
        <aside className="staff-detail" aria-label="Asignar rutina">
          <div className="staff-detail-card staff-form-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setPatientForRoutine(null)}
              aria-label="Cerrar asignacion de rutina"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>

            <p className="staff-eyebrow">Nueva rutina</p>
            <h2>
              Rutina para {patientForRoutine.nombre} {patientForRoutine.apellido}
            </h2>

            <RoutineForm
              actor={user}
              patient={patientForRoutine}
              loading={savingRoutine}
              onSubmit={handleSubmitRoutine}
            />
          </div>
        </aside>
      )}

      {selectedRoutine && (
        <RoutineDetailModal
          routine={selectedRoutine}
          canManage={ownsSelectedRoutine}
          canEdit={user.rol === 'profesional'}
          canDelete={user.rol === 'profesional'}
          deleting={deletingRoutine}
          onClose={() => setSelectedRoutine(null)}
          onEdit={handleOpenEditRoutine}
          onDelete={handleDeleteRoutine}
        />
      )}

      {editingRoutine && (
        <aside className="staff-detail" aria-label="Editar rutina">
          <div className="staff-detail-card staff-form-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setEditingRoutine(null)}
              aria-label="Cerrar edicion de rutina"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>

            <p className="staff-eyebrow">Editar rutina</p>
            <h2>{editingRoutine.titulo}</h2>

            <RoutineForm
              actor={user}
              patient={{ id: editingRoutine.paciente_id }}
              initialData={editingRoutine}
              loading={savingRoutine}
              mode="edit"
              onSubmit={handleUpdateRoutine}
            />
          </div>
        </aside>
      )}

      {patientWithoutRoutine && (
        <aside className="staff-detail" aria-label="Rutina">
          <div className="staff-detail-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setPatientWithoutRoutine(null)}
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>

            <p className="staff-eyebrow">Rutina</p>
            <h2>No hay rutina activa</h2>
            <p className="staff-confirm-copy">
              Este paciente todavía no tiene una rutina de ejercicios asignada.
            </p>

            <div className="staff-confirm-actions">
              <button
                type="button"
                className="staff-confirm-button primary"
                onClick={() => {
                  setPatientForRoutine(patientWithoutRoutine)
                  setPatientWithoutRoutine(null)
                }}
              >
                Asignar rutina
              </button>
            </div>
          </div>
        </aside>
      )}


      {patientForMedicalRecord && (
        <aside className="staff-detail" aria-label="Historia clínica">
          <div className="staff-detail-card staff-form-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setPatientForMedicalRecord(null)}
              aria-label="Cerrar historia clínica"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>

            <p className="staff-eyebrow">Historia clínica</p>

            <h2>
              {patientForMedicalRecord.nombre} {patientForMedicalRecord.apellido}
            </h2>

            <MedicalRecordForm
              actor={user}
              loading={savingMedicalRecord}
              onSubmit={handleCreateMedicalRecord}
              onUploadStudyPdf={uploadStudyPdf}
            />
          </div>
        </aside>
      )}

      {selectedMedicalRecord && (
        <aside className="staff-detail" aria-label="Historia clínica">
          <div className="staff-detail-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => {
                setSelectedMedicalRecord(null)
                setShowMedicalRecordActions(false)
              }}
              aria-label="Cerrar historia clínica"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>

            <div className="clinical-history-heading">
              <h2 className="clinical-history-title">Historia clínica</h2>

              <div className="clinical-history-actions-menu">
                {showMedicalRecordActions && (
                  <div className="clinical-history-actions-popover">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMedicalRecord(selectedMedicalRecord)
                        setSelectedMedicalRecord(null)
                        setShowMedicalRecordActions(false)
                      }}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleDownloadMedicalRecordPdf(selectedMedicalRecord)
                        setShowMedicalRecordActions(false)
                      }}
                    >
                      Exportar PDF
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="clinical-history-actions-toggle"
                  onClick={() =>
                    setShowMedicalRecordActions((currentValue) => !currentValue)
                  }
                  aria-label="Mostrar acciones de historia clínica"
                >
                  {showMedicalRecordActions ? (
                    <ChevronUp size={20} strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <ChevronDown size={20} strokeWidth={3} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <MedicalRecordDetail
              record={selectedMedicalRecord}
            />
          </div>
        </aside>
      )}

      {patientForSessionNotes && (
        <aside className="staff-detail" aria-label="Registro de sesiones">
          <div className="staff-detail-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => {
                setPatientForSessionNotes(null)
                setClinicalHistoryNotes([])
              }}
              aria-label="Cerrar registro de sesiones"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>

            <h2 className="clinical-history-title">Registro de sesiones</h2>
            <p className="staff-confirm-copy">
              {patientForSessionNotes.nombre} {patientForSessionNotes.apellido}
            </p>

            <ClinicalHistoryPanel
              notes={clinicalHistoryNotes}
              loading={loadingClinicalHistory}
              saving={savingSessionNote}
              onRegister={handleRegisterSessionNote}
            />
          </div>
        </aside>
      )}

      {editingMedicalRecord && (
        <aside className="staff-detail" aria-label="Editar historia clínica">
          <div className="staff-detail-card staff-form-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setEditingMedicalRecord(null)}
              aria-label="Cerrar edición de historia clínica"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>

            <p className="staff-eyebrow">Editar historia clínica</p>
            <h2>Historia clínica</h2>

            <MedicalRecordForm
              actor={user}
              initialData={editingMedicalRecord}
              loading={savingMedicalRecord}
              mode="edit"
              onSubmit={handleUpdateMedicalRecord}
              onUploadStudyPdf={uploadStudyPdf}
            />
          </div>
        </aside>
      )}

      {patientWithoutMedicalRecord && (
        <aside className="staff-detail" aria-label="Historia clínica">
          <div className="staff-detail-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setPatientWithoutMedicalRecord(null)}
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>

            <p className="staff-eyebrow">Historia clínica</p>
            <h2>No hay historia clínica cargada</h2>
            <p className="staff-confirm-copy">
              Este paciente todavía no tiene una historia clínica registrada.
            </p>

            <div className="staff-confirm-actions">
              <button
                type="button"
                className="staff-confirm-button primary"
                onClick={() => {
                  setPatientForMedicalRecord(patientWithoutMedicalRecord)
                  setPatientWithoutMedicalRecord(null)
                }}
              >
                Cargar historia clínica
              </button>
            </div>
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
              isSecretariaMode
              onSuccess={(msg, tabDestino, seccionDestino) => {
                setMessage(msg)
                setPatientForTurno(null)
                if (tabDestino && onNavegarATurnos) {
                  onNavegarATurnos(tabDestino) // navega a turnos y abre el tab pedido (ej: lista-espera)
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
