import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search, SlidersHorizontal, ScrollText, UserCog, X } from 'lucide-react'

import {
  createStaff,
  deactivateStaff,
  getStaff,
  getStaffDetail,
  updateStaff,
} from '../../services/staffService'
import { getAuditLogs } from '../../services/auditService'
import StaffFilters from './StaffFilters'
import StaffMemberForm from './StaffMemberForm'
import StaffTable from './StaffTable'
import '../../styles/staff-management.css'

const AUDIT_ACTION_LABELS = {
  CREATE_STAFF: 'Registró personal',
  UPDATE_STAFF: 'Editó personal',
  DELETE_STAFF: 'Dio de baja personal',
  CREATE_PATIENT: 'Registró paciente',
  UPDATE_PATIENT: 'Editó paciente',
}

const AUDIT_ACTION_FILTER_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Registrar personal', value: 'CREATE_STAFF' },
  { label: 'Editar personal', value: 'UPDATE_STAFF' },
  { label: 'Baja personal', value: 'DELETE_STAFF' },
  { label: 'Registrar paciente', value: 'CREATE_PATIENT' },
  { label: 'Editar paciente', value: 'UPDATE_PATIENT' },
]

const AUDIT_DATE_FILTER_OPTIONS = [
  { label: 'Todas', value: '' },
  { label: 'Hoy', value: 'today' },
  { label: 'Últimos 7 días', value: 'last7' },
  { label: 'Último mes', value: 'last30' },
  { label: 'Elegir fecha', value: 'custom' },
]

function formatRole(role) {
  const labels = {
    administrativo: 'administrativo',
    profesional: 'profesional',
    secretaria: 'secretaria',
  }

  if (labels[role]) {
    return labels[role]
  }

  return role
}

function getTodayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shouldStartWithMenu() {
  return window.matchMedia('(max-width: 760px)').matches
}

function getOnlyDate(dateValue) {
  const date = new Date(dateValue)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getAuditSearchText(log) {
  let actorDni = ''
  let targetDni = ''

  if (log.metadata) {
    if (log.metadata.actor_dni) {
      actorDni = log.metadata.actor_dni
    }

    if (log.metadata.target_dni) {
      targetDni = log.metadata.target_dni
    }
  }

  const values = [
    log.description,
    log.actor_role,
    log.action,
    AUDIT_ACTION_LABELS[log.action],
    actorDni,
    targetDni,
  ]
  const validValues = []

  for (const value of values) {
    if (value) {
      validValues.push(value)
    }
  }

  let searchText = ''

  for (const value of validValues) {
    if (searchText) {
      searchText = `${searchText} `
    }

    searchText = `${searchText}${value}`
  }

  return searchText.toLowerCase()
}

function getAuditLabel(action) {
  if (AUDIT_ACTION_LABELS[action]) {
    return AUDIT_ACTION_LABELS[action]
  }

  return action
}

function getAuditOptionLabel(options, selectedValue, fallback) {
  for (const option of options) {
    if (option.value === selectedValue) {
      return option.label
    }
  }

  return fallback
}

function getAuditFilterTitle(auditFilterStep) {
  if (auditFilterStep === 'action') {
    return 'Acción'
  }

  return 'Fecha'
}

function getAuditFilterEyebrow(auditFilterStep) {
  if (auditFilterStep === 'action') {
    return 'Filtrar por acción'
  }

  return 'Filtrar por fecha'
}

function getMobileSectionTitle(personalView) {
  if (personalView === 'audit') {
    return 'Auditoría'
  }

  return 'Gestión del personal'
}

function getMobileSectionCount(personalView, auditCount, staffCount) {
  if (personalView === 'audit') {
    return `${auditCount} movimientos`
  }

  return `${staffCount} personas`
}

function getShortTime(value) {
  if (!value) {
    return ''
  }

  return value.slice(0, 5)
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

function getDeactivateButtonText(deactivating) {
  if (deactivating) {
    return 'Confirmando...'
  }

  return 'Confirmar'
}

function getPersonalTabClass(personalView, tabName) {
  if (personalView === tabName) {
    return 'active'
  }

  return ''
}

function getStaffStatusText(staff) {
  if (staff.activo) {
    return 'Activo'
  }

  return 'Baja lógica'
}

function matchesAuditDate(log, auditDateFilter, auditCustomDate, todayInputValue) {
  if (!auditDateFilter) {
    return true
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const createdDate = getOnlyDate(log.created_at)

  if (auditDateFilter === 'today') {
    return createdDate.getTime() === today.getTime()
  }

  if (auditDateFilter === 'last7') {
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 6)
    return createdDate >= startDate
  }

  if (auditDateFilter === 'last30') {
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 29)
    return createdDate >= startDate
  }

  if (auditDateFilter === 'custom') {
    if (!auditCustomDate) {
      return true
    }

    if (auditCustomDate > todayInputValue) {
      return false
    }

    return log.created_at.slice(0, 10) === auditCustomDate
  }

  return true
}

function StaffManagementPage({ user }) {
  const [personalView, setPersonalView] = useState(() => {
    if (shouldStartWithMenu()) {
      return 'menu'
    }

    return 'staff'
  })
  const [selectedRole, setSelectedRole] = useState('')
  const [items, setItems] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [staffPendingDeactivate, setStaffPendingDeactivate] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditSearchTerm, setAuditSearchTerm] = useState('')
  const [auditActionFilter, setAuditActionFilter] = useState('')
  const [auditDateFilter, setAuditDateFilter] = useState('')
  const [auditCustomDate, setAuditCustomDate] = useState('')
  const [showAuditFilterModal, setShowAuditFilterModal] = useState(false)
  const [auditFilterStep, setAuditFilterStep] = useState('main')
  const todayInputValue = getTodayInputValue()

  const filteredItems = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    if (!search) {
      return items
    }

    const result = []

    for (const staff of items) {
      const searchableText = `${staff.nombre} ${staff.apellido} ${staff.dni} ${staff.email}`
      const normalizedText = searchableText.toLowerCase()

      if (normalizedText.includes(search)) {
        result.push(staff)
      }
    }

    return result
  }, [items, searchTerm])

  const filteredAuditLogs = useMemo(() => {
    const search = auditSearchTerm.trim().toLowerCase()
    const result = []

    for (const log of auditLogs) {
      const matchesAction = !auditActionFilter || log.action === auditActionFilter
      const matchesDate = matchesAuditDate(
        log,
        auditDateFilter,
        auditCustomDate,
        todayInputValue,
      )
      const searchableText = getAuditSearchText(log)
      const matchesSearch = !search || searchableText.includes(search)

      if (matchesAction && matchesDate && matchesSearch) {
        result.push(log)
      }
    }

    return result
  }, [
    auditActionFilter,
    auditCustomDate,
    auditDateFilter,
    auditLogs,
    auditSearchTerm,
    todayInputValue,
  ])
  const mobileSectionTitle = getMobileSectionTitle(personalView)
  const mobileSectionCount = getMobileSectionCount(
    personalView,
    filteredAuditLogs.length,
    filteredItems.length,
  )

  async function loadStaff() {
    setLoading(true)
    setError('')

    try {
      let roleFilter = selectedRole

      if (user.rol === 'secretaria') {
        roleFilter = ''
      }

      const response = await getStaff(user, {
        rol: roleFilter,
        includeInactive: false,
      })
      setItems(response.items)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(loadStaff)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole])

  useEffect(() => {
    if (user.rol === 'secretaria' && selectedRole !== '' && selectedRole !== 'profesional') {
      setSelectedRole('')
    }
  }, [selectedRole, user.rol])

  useEffect(() => {
    if (personalView !== 'audit') {
      return
    }

    async function loadAudit() {
      setAuditLoading(true)
      setError('')

      try {
        const response = await getAuditLogs(user)
        setAuditLogs(response.items)
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setAuditLoading(false)
      }
    }

    Promise.resolve().then(loadAudit)
  }, [personalView, user])

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

  async function handleView(staff) {
    setError('')
    setMessage('')

    try {
      const detail = await getStaffDetail(user, staff.id)
      setSelectedStaff(detail)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function handleDeactivate(staff) {
    setError('')
    setMessage('')
    setStaffPendingDeactivate(staff)
  }

  async function confirmDeactivateStaff() {
    if (!staffPendingDeactivate) {
      return
    }

    setDeactivating(true)
    setError('')
    setMessage('')

    try {
      const response = await deactivateStaff(user, staffPendingDeactivate.id)
      setMessage(response.message)
      setSelectedStaff(null)
      setStaffPendingDeactivate(null)
      await loadStaff()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setDeactivating(false)
    }
  }

  async function handleEdit(staff) {
    setError('')
    setMessage('')

    try {
      const detail = await getStaffDetail(user, staff.id)
      setEditingStaff(detail)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleCreateStaff(payload) {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const createdStaff = await createStaff(user, payload)
      setMessage(
        `Se registró al ${formatRole(createdStaff.rol)} ${createdStaff.nombre} ${createdStaff.apellido} correctamente, se envió un mail de confirmación al mail correspondiente.`,
      )
      setShowRegisterModal(false)
      await loadStaff()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateStaff(payload) {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const updatedStaff = await updateStaff(user, editingStaff.id, payload)
      setMessage(`${updatedStaff.nombre} ${updatedStaff.apellido} fue actualizado correctamente.`)
      setEditingStaff(null)
      await loadStaff()
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

  function handleOpenAuditFilters() {
    setAuditFilterStep('main')
    setShowAuditFilterModal(true)
  }

  function handleClearAuditFilters() {
    setAuditActionFilter('')
    setAuditDateFilter('')
    setAuditCustomDate('')
  }

  function handleAuditCustomDateChange(event) {
    const selectedDate = event.target.value

    if (selectedDate > todayInputValue) {
      setAuditCustomDate(todayInputValue)
      return
    }

    setAuditCustomDate(selectedDate)
  }

  function handleAuditFilterOption(option) {
    if (auditFilterStep === 'action') {
      setAuditActionFilter(option.value)
      setAuditFilterStep('main')
      return
    }

    setAuditDateFilter(option.value)

    if (option.value !== 'custom') {
      setAuditCustomDate('')
      setAuditFilterStep('main')
    }
  }

  function getCurrentAuditOptions() {
    if (auditFilterStep === 'action') {
      return AUDIT_ACTION_FILTER_OPTIONS
    }

    return AUDIT_DATE_FILTER_OPTIONS
  }

  function getAuditFilterButtonClass(optionValue) {
    let currentValue = auditDateFilter

    if (auditFilterStep === 'action') {
      currentValue = auditActionFilter
    }

    if (currentValue === optionValue) {
      return 'active'
    }

    return ''
  }

  function renderAuditLogs() {
    const articles = []

    for (const log of filteredAuditLogs) {
      let actorDni = 'Sin DNI'
      let targetDni = ''

      if (log.metadata) {
        if (log.metadata.actor_dni) {
          actorDni = log.metadata.actor_dni
        }

        if (log.metadata.target_dni) {
          targetDni = log.metadata.target_dni
        }
      }

      articles.push(
        <article className="audit-item" key={log.id}>
          <span>{new Date(log.created_at).toLocaleString('es-AR')}</span>
          <strong>{log.description}</strong>
          <p>
            {log.actor_role} · {actorDni}
          </p>
          {targetDni && <p>DNI afectado: {targetDni}</p>}
          <p>{getAuditLabel(log.action)}</p>
        </article>,
      )
    }

    return articles
  }

  function renderAuditFilterOptions() {
    const buttons = []
    const options = getCurrentAuditOptions()

    for (const option of options) {
      buttons.push(
        <button
          type="button"
          key={option.value || 'all'}
          className={getAuditFilterButtonClass(option.value)}
          onClick={() => handleAuditFilterOption(option)}
        >
          {option.label}
        </button>,
      )
    }

    return buttons
  }

  return (
    <main className="staff-page">
      <section className="staff-shell" aria-labelledby="staff-title">
        <section className="staff-panel" aria-label="Personal">
          {personalView === 'menu' ? (
            <div className="personal-mobile-menu">
              <div className="staff-panel-header">
                <div>
                  <h1 id="staff-title">Personal</h1>
                  <p>Elegí qué querés administrar.</p>
                </div>
              </div>

              <div className="personal-mobile-options">
                <button type="button" onClick={() => setPersonalView('staff')}>
                  <UserCog size={34} strokeWidth={2.4} aria-hidden="true" />
                  <span>Gestión del personal</span>
                </button>
                <button type="button" onClick={() => setPersonalView('audit')}>
                  <ScrollText size={34} strokeWidth={2.4} aria-hidden="true" />
                  <span>Auditoría</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="personal-desktop-tabs" aria-label="Secciones de personal">
                <button
                  type="button"
                  className={getPersonalTabClass(personalView, 'staff')}
                  onClick={() => setPersonalView('staff')}
                >
                  Gestión del personal
                </button>
                <button
                  type="button"
                  className={getPersonalTabClass(personalView, 'audit')}
                  onClick={() => setPersonalView('audit')}
                >
                  Auditoría
                </button>
              </div>

              <div className="personal-mobile-section-header">
                <button
                  type="button"
                  className="personal-mobile-back"
                  onClick={() => setPersonalView('menu')}
                  aria-label="Volver al menu de personal"
                >
                  <ArrowLeft size={20} strokeWidth={3} aria-hidden="true" />
                </button>
                <div className="personal-mobile-heading">
                  <h1>{mobileSectionTitle}</h1>
                  <p>{mobileSectionCount}</p>
                </div>
              </div>

              {personalView === 'audit' ? (
                <div className="audit-placeholder">
                  <div className="staff-panel-header personal-content-header">
                    <div>
                      <h1 id="staff-title">Auditoría</h1>
                      <p>{filteredAuditLogs.length} movimientos encontrados</p>
                    </div>
                  </div>

                  <div className="audit-filters" aria-label="Filtros de auditoria">
                    <label className="audit-search" aria-label="Buscar en auditoria">
                      <Search size={18} strokeWidth={3} aria-hidden="true" />
                      <input
                        type="search"
                        value={auditSearchTerm}
                        onChange={(event) => setAuditSearchTerm(event.target.value)}
                        placeholder="Buscar por DNI, accion o detalle"
                      />
                    </label>

                    <button
                      type="button"
                      className="audit-filter-button"
                      onClick={handleOpenAuditFilters}
                    >
                      <SlidersHorizontal size={18} strokeWidth={3} aria-hidden="true" />
                      Filtros
                    </button>
                  </div>

                  {auditLoading ? (
                    <p className="staff-empty">Cargando auditoría...</p>
                  ) : filteredAuditLogs.length ? (
                    <div className="audit-list">{renderAuditLogs()}</div>
                  ) : (
                    <div className="audit-placeholder-card">
                      <ScrollText size={34} strokeWidth={2.4} aria-hidden="true" />
                      <h2>Sin movimientos para mostrar</h2>
                      <p>
                        Probá cambiando la búsqueda o el filtro seleccionado.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="staff-panel-header personal-content-header">
                    <div>
                      <h1 id="staff-title">Gestión del personal</h1>
                      <p>{filteredItems.length} personas encontradas</p>
                    </div>
                  </div>

                  <div className="staff-tools">
                    <StaffFilters
                      actorRole={user.rol}
                      selectedRole={selectedRole}
                      onRoleChange={setSelectedRole}
                      onSearch={handleOpenSearch}
                      searchActive={Boolean(searchTerm)}
                      onRegister={handleOpenRegisterModal}
                    />

                    {showSearch && (
                      <div className="staff-search-overlay">
                        <label className="staff-search" aria-label="Buscar personal">
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

                  <StaffTable
                    items={filteredItems}
                    loading={loading}
                    currentUserId={user.user_id}
                    currentUserRole={user.rol}
                    onEdit={handleEdit}
                    onView={handleView}
                    onDeactivate={handleDeactivate}
                  />
                </>
              )}
            </>
          )}
        </section>
      </section>

      {showAuditFilterModal && (
        <aside className="staff-detail" aria-label="Filtros de auditoria">
          <div className="staff-detail-card audit-filter-modal">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setShowAuditFilterModal(false)}
              aria-label="Cerrar filtros de auditoria"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>

            {auditFilterStep === 'main' ? (
              <>
                <p className="staff-eyebrow">Auditoría</p>
                <h2>Filtros</h2>
                <div className="audit-filter-menu">
                  <button type="button" onClick={() => setAuditFilterStep('action')}>
                    <span>Acción</span>
                    <small>
                      {getAuditOptionLabel(
                        AUDIT_ACTION_FILTER_OPTIONS,
                        auditActionFilter,
                        'Todos',
                      )}
                    </small>
                  </button>
                  <button type="button" onClick={() => setAuditFilterStep('date')}>
                    <span>Fecha</span>
                    <small>
                      {getAuditOptionLabel(
                        AUDIT_DATE_FILTER_OPTIONS,
                        auditDateFilter,
                        'Todas',
                      )}
                    </small>
                  </button>
                </div>
                <div className="staff-confirm-actions">
                  <button
                    type="button"
                    className="staff-confirm-button secondary"
                    onClick={handleClearAuditFilters}
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    className="staff-confirm-button primary"
                    onClick={() => setShowAuditFilterModal(false)}
                  >
                    Aplicar
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="audit-filter-back"
                  onClick={() => setAuditFilterStep('main')}
                >
                  <ArrowLeft size={18} strokeWidth={3} aria-hidden="true" />
                  Volver
                </button>
                <p className="staff-eyebrow">{getAuditFilterEyebrow(auditFilterStep)}</p>
                <h2>{getAuditFilterTitle(auditFilterStep)}</h2>
                <div className="audit-filter-options">{renderAuditFilterOptions()}</div>
                {auditFilterStep === 'date' && auditDateFilter === 'custom' && (
                  <label className="staff-form-field audit-custom-date">
                    <span>Fecha</span>
                    <input
                      type="date"
                      value={auditCustomDate}
                      max={todayInputValue}
                      onChange={handleAuditCustomDateChange}
                    />
                  </label>
                )}
              </>
            )}
          </div>
        </aside>
      )}

      {selectedStaff && (
        <aside className="staff-detail" aria-label="Detalle del personal">
          <div className="staff-detail-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setSelectedStaff(null)}
              aria-label="Cerrar detalle"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>
            <p className="staff-eyebrow">{selectedStaff.rol}</p>
            <h2>
              {selectedStaff.nombre} {selectedStaff.apellido}
            </h2>
            <dl>
              <div>
                <dt>DNI</dt>
                <dd>{selectedStaff.dni}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{selectedStaff.email}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{selectedStaff.telefono}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{getStaffStatusText(selectedStaff)}</dd>
              </div>
              {selectedStaff.profesional && (
                <>
                  <div>
                    <dt>Matrícula</dt>
                    <dd>{selectedStaff.profesional.matricula}</dd>
                  </div>
                  <div>
                    <dt>Especialidad</dt>
                    <dd>{selectedStaff.profesional.especialidad}</dd>
                  </div>
                  <div>
                    <dt>Área</dt>
                    <dd>{selectedStaff.profesional.area_tratamiento}</dd>
                  </div>
                  <div>
                    <dt>Horario entrada</dt>
                    <dd>{getShortTime(selectedStaff.profesional.horario_entrada)}</dd>
                  </div>
                  <div>
                    <dt>Horario salida</dt>
                    <dd>{getShortTime(selectedStaff.profesional.horario_salida)}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </aside>
      )}

      {showRegisterModal && (
        <aside className="staff-detail" aria-label="Registrar miembro">
          <div className="staff-detail-card staff-form-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setShowRegisterModal(false)}
              aria-label="Cerrar registro de miembro"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>
            <p className="staff-eyebrow">Nuevo miembro</p>
            <h2>Registrar miembro</h2>
            <StaffMemberForm
              actorRole={user.rol}
              loading={saving}
              onSubmit={handleCreateStaff}
            />
          </div>
        </aside>
      )}

      {editingStaff && (
        <aside className="staff-detail" aria-label="Editar miembro">
          <div className="staff-detail-card staff-form-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setEditingStaff(null)}
              aria-label="Cerrar edicion de miembro"
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>
            <p className="staff-eyebrow">Editar miembro</p>
            <h2>
              {editingStaff.nombre} {editingStaff.apellido}
            </h2>
            <StaffMemberForm
              actorRole={user.rol}
              initialData={editingStaff}
              loading={saving}
              mode="edit"
              onSubmit={handleUpdateStaff}
            />
          </div>
        </aside>
      )}

      {staffPendingDeactivate && (
        <aside className="staff-detail" aria-label="Confirmar baja">
          <div className="staff-detail-card staff-confirm-card">
            <button
              type="button"
              className="staff-detail-close"
              onClick={() => setStaffPendingDeactivate(null)}
              aria-label="Cerrar confirmacion de baja"
              disabled={deactivating}
            >
              <X size={18} strokeWidth={3} aria-hidden="true" />
            </button>
            <p className="staff-eyebrow">Confirmar baja</p>
            <h2>¿Querés confirmar la baja?</h2>
            <p className="staff-confirm-copy">
              Se dará de baja a {staffPendingDeactivate.nombre} {staffPendingDeactivate.apellido}.
            </p>
            <div className="staff-confirm-actions">
              <button
                type="button"
                className="staff-confirm-button secondary"
                onClick={() => setStaffPendingDeactivate(null)}
                disabled={deactivating}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="staff-confirm-button danger"
                onClick={confirmDeactivateStaff}
                disabled={deactivating}
              >
                {getDeactivateButtonText(deactivating)}
              </button>
            </div>
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

export default StaffManagementPage
