import { Search } from 'lucide-react'

const ROLE_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Profesionales', value: 'profesional' },
  { label: 'Secretarias', value: 'secretaria' },
  { label: 'Administrativos', value: 'administrativo' },
]

function StaffFilters({ actorRole, selectedRole, onRoleChange, onRegister, onSearch, searchActive }) {
  const visibleOptions = []

  for (const option of ROLE_OPTIONS) {
    if (actorRole === 'administrativo' || option.value !== 'administrativo') {
      visibleOptions.push(option)
    }
  }

  function getSearchClass() {
    if (searchActive) {
      return 'staff-search-trigger active'
    }

    return 'staff-search-trigger'
  }

  function getOptionClass(optionValue) {
    if (selectedRole === optionValue) {
      return 'active'
    }

    return ''
  }

  function renderOptions() {
    const buttons = []

    for (const option of visibleOptions) {
      buttons.push(
        <button
          type="button"
          key={option.value || 'all'}
          className={getOptionClass(option.value)}
          onClick={() => onRoleChange(option.value)}
        >
          {option.label}
        </button>,
      )
    }

    return buttons
  }

  return (
    <div className="staff-filters" aria-label="Filtros de personal">
      <div className="staff-filter-left">
        <button
          type="button"
          className={getSearchClass()}
          onClick={onSearch}
          aria-label="Buscar personal"
        >
          <Search size={18} strokeWidth={3} aria-hidden="true" />
        </button>

        <div className="staff-filter-tabs">{renderOptions()}</div>
      </div>

      <button type="button" className="staff-register-button" onClick={onRegister}>
        Registrar miembro
      </button>
    </div>
  )
}

export default StaffFilters
