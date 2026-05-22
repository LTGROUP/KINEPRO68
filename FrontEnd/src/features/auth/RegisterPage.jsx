import { useEffect, useState } from 'react'

import { registerUser } from '../../services/authService'
import RegisterForm from './RegisterForm'

function RegisterPage({ onSwitchToLogin }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  async function handleRegister(payload) {
    setLoading(true)
    setError('')
    setShowSuccessModal(false)

    try {
      await registerUser(payload)
      setShowSuccessModal(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!error) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setError('')
    }, 5000)

    return () => window.clearTimeout(timeoutId)
  }, [error])

  function handleCloseSuccessModal() {
    setShowSuccessModal(false)

    if (onSwitchToLogin) {
      onSwitchToLogin()
    }
  }

  return (
    <>
      <section className="auth-content">
        <div className="auth-heading">
          <h2>Crear cuenta</h2>
          <p>Completá tus datos para acceder al sistema como paciente.</p>
        </div>

        <RegisterForm onSubmit={handleRegister} loading={loading} />

        {error && (
          <p className="auth-message error" role="alert">
            {error}
          </p>
        )}

        <p className="auth-switch-copy">
          ¿Ya tenés cuenta?{' '}
          <button type="button" onClick={onSwitchToLogin}>
            Iniciá sesión
          </button>
        </p>
      </section>

      {showSuccessModal && (
        <aside className="auth-success-overlay" aria-label="Cuenta registrada">
          <div className="auth-success-card">
            <h3>Cuenta registrada con éxito</h3>
            <p>
              Revisá tu casilla de email con la que te registraste para acceder al
              sistema.
            </p>
            <button
              type="button"
              className="auth-submit"
              onClick={handleCloseSuccessModal}
            >
              Cerrar
            </button>
          </div>
        </aside>
      )}
    </>
  )
}

export default RegisterPage
