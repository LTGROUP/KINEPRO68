import { useEffect, useState } from 'react'

import { AuthLayout } from './features/auth'
import ResetPasswordPage from './features/auth/ResetPasswordPage'
import AceptarTurnoPage from './features/turnos/public/AceptarTurnoPage'
import { HomePage, ProfilePage } from './features/check-in'
import { PatientsPage } from './features/patients'
import { StaffManagementPage } from './features/staff-management'
import { TurnosPage } from './features/turnos'
import { AppLayout } from './layouts'
import { AgendaProfesional } from './features/turnos/secretaria/AgendaProfesional'
import AgendaProfesionalView from './features/turnos/profesional/AgendaProfesionalView'
import { MetricasPage } from './features/metricas'

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

// Logica unificada: inicializamos segun el rol del usuario
function getInitialSectionForUser(currentUser) {
  if (!currentUser) return 'inicio'

  if (currentUser.rol === 'secretaria' || currentUser.rol === 'profesional') {
    return 'inicio'
  }

  // Pacientes van a turnos por defecto
  return 'turnos'
}

function getIsRecoveryFlow() {
  if (hasPasswordRecoveryFlow()) {
    return true
  }
  return false
}

function getIsAceptarTurnoFlow() {
  const params = new URLSearchParams(window.location.search)
  return window.location.pathname === '/aceptar-turno' && params.has('token')
}

function App() {
  const isRecoveryFlow = getIsRecoveryFlow()
  const isAceptarTurnoFlow = getIsAceptarTurnoFlow()
  const [user, setUser] = useState(readStoredSession)

  // Usamos el hook de inicio basado en el usuario actual
  const [activeSection, setActiveSection] = useState(() => {
    return getInitialSectionForUser(readStoredSession())
  })
  const [tabInicialTurnos, setTabInicialTurnos] = useState(null)

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
    // Redirigimos correctamente según el rol recién ingresado
    setActiveSection(getInitialSectionForUser(savedSession))
  }

  function handleLogout() {
    clearStoredSession()
    setUser(null)
    setActiveSection('inicio')
  }

  // Navega a Turnos abriendo directamente un tab específico (ej: lista-espera)
  function manejarNavegacionATurnos(tab) {
    setTabInicialTurnos(tab)
    setActiveSection('turnos')
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
    if (activeSection === 'inicio' && user.rol === 'secretaria') {
      return <AgendaProfesional user={user} />
    }

    if (activeSection === 'inicio' && user.rol === 'profesional') {
      return <AgendaProfesionalView user={user} />
    }

    // Si es un paciente y por algún motivo llegó a inicio, le mostramos el home base
    if (activeSection === 'inicio') {
      return <HomePage user={user} />
    }

    if (activeSection === 'personal' && canManageStaff) {
      return <StaffManagementPage user={user} />
    }

    if (activeSection === 'turnos') {
      return (
        <TurnosPage
          user={user}
          onSectionChange={setActiveSection}
          tabInicial={tabInicialTurnos}
          onTabInicialConsumido={() => setTabInicialTurnos(null)}
        />
      )
    }

    if (activeSection === 'pacientes' && canManagePatients) {
      return (
        <PatientsPage
          user={user}
          onSectionChange={setActiveSection}
          onNavegarATurnos={manejarNavegacionATurnos}
        />
      )
    }

    if (activeSection === 'perfil') {
      return <ProfilePage user={user} />
    }

    if (activeSection === 'metricas' && canUserManage(user)) {
      return <MetricasPage user={user} />
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

  if (isAceptarTurnoFlow) {
    return <AceptarTurnoPage />
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