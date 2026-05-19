import { useState } from 'react'

import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'

function AuthLayout() {
  const [currentView, setCurrentView] = useState('welcome')
  // En desktop siempre se ve un formulario. "welcome" se usa solo para mobile,
  // donde primero mostramos los botones y después abrimos el modal.
  const formView = currentView === 'register' ? 'register' : 'login'
  const isLogin = formView === 'login'
  const showMobileForm = currentView !== 'welcome'

  return (
    <main className="auth-shell">
      <section className="auth-brand" aria-labelledby="brand-title">
        <div className="brand-logo">
          <div className="brand-mark" aria-hidden="true">
            KP
          </div>
          <p className="brand-eyebrow">KinePro</p>
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
              onClick={() => setCurrentView('login')}
            >
              <span>Iniciar sesión</span>
            </button>
            <button
              type="button"
              className="auth-choice-card"
              onClick={() => setCurrentView('register')}
            >
              <span>Registrarse</span>
            </button>
          </div>
        )}
      </section>

      {showMobileForm && <div className="auth-backdrop" aria-hidden="true" />}

      <section
        className="auth-panel"
        data-open={showMobileForm ? 'true' : 'false'}
        aria-label="Acceso a KinePro"
      >
        <div className="auth-mode-tabs" aria-label="Elegir modo de acceso">
          <button
            type="button"
            className={isLogin ? 'active' : ''}
            onClick={() => setCurrentView('login')}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={!isLogin ? 'active' : ''}
            onClick={() => setCurrentView('register')}
          >
            Registrarse
          </button>
        </div>

        <button
          type="button"
          className="auth-close"
          onClick={() => setCurrentView('welcome')}
          aria-label="Cerrar formulario"
        >
          x
        </button>

        <div className="auth-view" key={formView}>
          {isLogin ? (
            <LoginPage onSwitchToRegister={() => setCurrentView('register')} />
          ) : (
            <RegisterPage onSwitchToLogin={() => setCurrentView('login')} />
          )}
        </div>
      </section>
    </main>
  )
}

export default AuthLayout
