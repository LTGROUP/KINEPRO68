import { getNavigationForRole } from './navigation'

function MobileBottomNav({ userRole, activeSection, onSectionChange }) {
  const navItems = getNavigationForRole(userRole)

  function getButtonClass(itemId) {
    if (activeSection === itemId) {
      return 'active'
    }

    return ''
  }

  function renderNavItems() {
    const buttons = []

    for (const item of navItems) {
      const Icon = item.Icon

      buttons.push(
        <button
          key={item.id}
          type="button"
          className={getButtonClass(item.id)}
          onClick={() => onSectionChange(item.id)}
        >
          <Icon className="mobile-bottom-icon" aria-hidden="true" />
          <span>{item.shortLabel}</span>
        </button>,
      )
    }

    return buttons
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegacion mobile">
      {renderNavItems()}
    </nav>
  )
}

export default MobileBottomNav
