import { useState } from 'react'
import { X } from 'lucide-react'


import ForgotPasswordPage from './ForgotPasswordPage'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'

function AuthLayout({ onLoginSuccess }) {
  const [currentView, setCurrentView] = useState('welcome')
  // En desktop siempre se ve un formulario. "welcome" se usa solo para mobile,
  // donde primero mostramos los botones y después abrimos el modal.
  let formView = 'login'

  if (currentView === 'register') {
    formView = 'register'
  }

  if (currentView === 'forgot') {
    formView = 'forgot'
  }

  const isLogin = formView === 'login'
  const isForgotPassword = formView === 'forgot'
  const showMobileForm = currentView !== 'welcome'

  function openLogin() {
    setCurrentView('login')
  }

  function openRegister() {
    setCurrentView('register')
  }

  function openForgotPassword() {
    setCurrentView('forgot')
  }

  function closeMobileForm() {
    setCurrentView('welcome')
  }

  function getPanelOpenValue() {
    if (showMobileForm) {
      return 'true'
    }

    return 'false'
  }

  function getLoginTabClass() {
    if (isLogin) {
      return 'active'
    }

    return ''
  }

  function getRegisterTabClass() {
    if (!isLogin) {
      return 'active'
    }

    return ''
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand" aria-labelledby="brand-title">
        <div className="brand-logo">
          <img
            className="brand-logo-image"
            src="/KinePro.jpg"
            alt="KinePro"
          />
        </div>

        <div className="brand-main">
          <h1 id="brand-title">La gestión de tus turnos en un solo lugar.</h1>
          <p className="brand-copy">
            Una plataforma simple para coordinar pacientes, profesionales y agenda clínica.
          </p>
          <ul className="brand-list" aria-label="Funcionalidades principales">
            <li>Reserva de turnos</li>
            <li>Seguimiento clínico</li>
            <li>Gestión del equipo</li>
          </ul>
        </div>

        {!showMobileForm && (
          <div className="auth-choice-grid mobile-auth-choice">
            <button
              type="button"
              className="auth-choice-card"
              onClick={openLogin}
            >
              <span>Iniciar sesión</span>
            </button>
            <button
              type="button"
              className="auth-choice-card"
              onClick={openRegister}
            >
              <span>Registrarse</span>
            </button>
          </div>
        )}
      </section>

      {showMobileForm && <div className="auth-backdrop" aria-hidden="true" />}

      <section
        className="auth-panel"
        data-open={getPanelOpenValue()}
        data-view={formView}
        aria-label="Acceso a KinePro"
      >
        {!isForgotPassword && (
          <div
            className="auth-mode-tabs"
            data-active={formView}
            aria-label="Elegir modo de acceso"
          >
            <button
              type="button"
              className={getLoginTabClass()}
              onClick={openLogin}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={getRegisterTabClass()}
              onClick={openRegister}
            >
              Registrarse
            </button>
          </div>
        )}

        <button
          type="button"
          className="auth-close"
          onClick={closeMobileForm}
          aria-label="Cerrar formulario"
        >
          <X size={18} strokeWidth={3} aria-hidden="true" />
        </button>

        <div className="auth-view" key={formView}>
          {isForgotPassword ? (
            <ForgotPasswordPage onBackToLogin={openLogin} />
          ) : isLogin ? (
            <LoginPage
              onLoginSuccess={onLoginSuccess}
              onSwitchToRegister={openRegister}
              onForgotPassword={openForgotPassword}
            />
          ) : (
            <RegisterPage onSwitchToLogin={openLogin} />
          )}
        </div>
      </section>
    </main>
  )
}

export default AuthLayout
