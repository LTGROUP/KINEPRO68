import { useEffect, useState } from 'react'

import { AuthLayout } from './features/auth'
import ResetPasswordPage from './features/auth/ResetPasswordPage'
import { HomePage, ProfilePage } from './features/check-in'
import { PatientsPage } from './features/patients'
import { StaffManagementPage } from './features/staff-management'
import { AppLayout } from './layouts'
import { clearPasswordRecoveryFlow, hasPasswordRecoveryFlow, supabase } from './lib/supabase/client'
import {
  SESSION_EXPIRED_EVENT,
  SESSION_REFRESHED_EVENT,
  clearStoredSession,
  readStoredSession,
  saveStoredSession,
} from './services/authService'
import './styles/auth.css'
import './styles/app-layout.css'

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

function getIsRecoveryFlow() {
  if (hasPasswordRecoveryFlow()) {
    return true
  }

  return false
}

function App() {
  const isRecoveryFlow = getIsRecoveryFlow()
  const [user, setUser] = useState(readStoredSession)
  const [activeSection, setActiveSection] = useState(() => {
    const storedUser = readStoredSession()

    if (canUserManage(storedUser)) {
      return 'personal'
    }

    return 'inicio'
  })
  const canManageStaff = canUserManage(user)
  const canManagePatients = canUserManage(user)

  useEffect(() => {
    function handleExpiredSession() {
      clearStoredSession()
      setUser(null)
      setActiveSection('inicio')
    }

    function handleRefreshedSession(event) {
      setUser(event.detail)
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpiredSession)
    window.addEventListener(SESSION_REFRESHED_EVENT, handleRefreshedSession)

    return function cleanupSessionListeners() {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpiredSession)
      window.removeEventListener(SESSION_REFRESHED_EVENT, handleRefreshedSession)
    }
  }, [])

  function handleLoginSuccess(session, keepSession) {
    const savedSession = saveStoredSession(session, keepSession)
    setUser(savedSession)
    setActiveSection(getInitialSectionForUser(savedSession))
  }

  function handleLogout() {
    clearStoredSession()
    setUser(null)
    setActiveSection('inicio')
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

  function renderActiveSection() {
    if (activeSection === 'inicio') {
      return <HomePage user={user} />
    }

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

  async function handleRecoveryFinish() {
    if (supabase) {
      await supabase.auth.signOut()
    }

    clearStoredSession()
    clearPasswordRecoveryFlow()
    window.history.replaceState({}, '', '/')
    window.location.reload()
  }

  if (isRecoveryFlow) {
    return <ResetPasswordPage onFinish={handleRecoveryFinish} />
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
