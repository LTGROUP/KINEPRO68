import { useState } from 'react'

import { AuthLayout } from './features/auth'
import { ProfilePage } from './features/check-in'
import { PatientsPage } from './features/patients'
import { StaffManagementPage } from './features/staff-management'
import { AppLayout } from './layouts'
import './styles/auth.css'
import './styles/app-layout.css'

const SESSION_STORAGE_KEY = 'kinepro_session'

function getStoredSession() {
  const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY)

  if (!storedSession) {
    return null
  }

  try {
    return JSON.parse(storedSession)
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

function canUserManage(currentUser) {
  if (!currentUser) {
    return false
  }

  if (currentUser.rol === 'administrativo') {
    return true
  }

  if (currentUser.rol === 'secretaria') {
    return true
  }

  return false
}

function getInitialSectionForUser(currentUser) {
  if (canUserManage(currentUser)) {
    return 'personal'
  }

  return 'inicio'
}

function App() {
  const [user, setUser] = useState(getStoredSession)
  const [activeSection, setActiveSection] = useState(() => {
    const storedUser = getStoredSession()

    if (canUserManage(storedUser)) {
      return 'personal'
    }

    return 'inicio'
  })
  const canManageStaff = canUserManage(user)
  const canManagePatients = canUserManage(user)

  function handleLoginSuccess(session) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    setUser(session)
    setActiveSection(getInitialSectionForUser(session))
  }

  function handleLogout() {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    setUser(null)
    setActiveSection('inicio')
  }

  function renderActiveSection() {
    if (activeSection === 'personal' && canManageStaff) {
      return <StaffManagementPage user={user} />
    }

    if (activeSection === 'pacientes' && canManagePatients) {
      return <PatientsPage user={user} />
    }

    if (activeSection === 'perfil') {
      return <ProfilePage user={user} />
    }

    return (
      <section className="app-placeholder" aria-labelledby="placeholder-title">
        <p className="app-placeholder-eyebrow">KinePro</p>
        <h1 id="placeholder-title">{getSectionTitle(activeSection)}</h1>
        <p>Esta pantalla queda lista para que el equipo agregue su funcionalidad.</p>
      </section>
    )
  }

  function getSectionTitle(sectionId) {
    const titles = {
      inicio: 'Inicio',
      turnos: 'Turnos',
      pacientes: 'Pacientes',
      personal: 'Gestión del personal',
      metricas: 'Métricas',
      perfil: 'Perfil',
    }

    if (titles[sectionId]) {
      return titles[sectionId]
    }

    return 'Inicio'
  }

  if (user) {
    return (
      <AppLayout
        user={user}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
      >
        {renderActiveSection()}
      </AppLayout>
    )
  }

  return <AuthLayout onLoginSuccess={handleLoginSuccess} />
}

export default App
