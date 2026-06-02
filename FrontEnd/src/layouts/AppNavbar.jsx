import { useEffect, useState } from 'react'

import { getNavigationForRole } from './navigation'

function AppNavbar({ user, activeSection, onSectionChange, onLogout }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const navItems = getNavigationForRole(user.rol)
  let userInitial = 'U'

  useEffect(() => {
    function checkScrollPosition() {
      if (window.scrollY > 8) {
        setIsScrolled(true)
        return
      }

      setIsScrolled(false)
    }

    checkScrollPosition()
    window.addEventListener('scroll', checkScrollPosition)

    return function cleanupScrollListener() {
      window.removeEventListener('scroll', checkScrollPosition)
    }
  }, [])

  if (user.nombre) {
    userInitial = user.nombre.charAt(0).toUpperCase()
  }

  function handleSectionClick(sectionId) {
    onSectionChange(sectionId)
    setShowUserMenu(false)
  }

  function handleToggleUserMenu() {
    setShowUserMenu((currentValue) => !currentValue)
  }

  function handleCloseUserMenu() {
    setShowUserMenu(false)
  }

  function getNavButtonClass(itemId) {
    if (activeSection === itemId) {
      return 'active'
    }

    return ''
  }

  function renderNavItems() {
    const buttons = []

    for (const item of navItems) {
      buttons.push(
        <button
          key={item.id}
          type="button"
          className={getNavButtonClass(item.id)}
          onClick={() => handleSectionClick(item.id)}
        >
          {item.label}
        </button>,
      )
    }

    return buttons
  }

  return (
    <header className={isScrolled ? 'app-navbar app-navbar-scrolled' : 'app-navbar'}>
      <div className="app-navbar-mobile-top">
        <button
          type="button"
          className="app-user-menu-button"
          onClick={handleToggleUserMenu}
          aria-label="Abrir menu de usuario"
          aria-expanded={showUserMenu}
        >
          <span />
          <span />
          <span />
        </button>

        <img className="app-navbar-logo mobile" src="/KinePro.jpg" alt="KinePro" />
      </div>

      <div className="app-navbar-desktop">
        <img className="app-navbar-logo" src="/KinePro.jpg" alt="KinePro" />

        <nav className="app-navbar-links" aria-label="Navegacion principal">
          {renderNavItems()}
        </nav>

        <div className="app-user-session">
          <span>
            {user.nombre} · {user.rol}
          </span>
          <button type="button" className="app-logout-button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {showUserMenu && (
        <div className="app-user-menu-layer" onClick={handleCloseUserMenu}>
          <div
            className="app-user-menu"
            role="dialog"
            aria-label="Menu de usuario"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-user-menu-profile">
              <div className="app-user-avatar" aria-hidden="true">
                {userInitial}
              </div>
              <div>
                <strong>{user.nombre}</strong>
                <span>{user.rol}</span>
              </div>
            </div>
            <button type="button" className="app-logout-button" onClick={onLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

export default AppNavbar
