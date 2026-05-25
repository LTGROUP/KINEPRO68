import { useEffect, useState } from 'react'

import { forgotPassword, loginUser } from '../../services/authService'
import LoginForm from './LoginForm'

function LoginPage({ onLoginSuccess, onSwitchToRegister }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotForm, setShowForgotForm] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  async function handleLogin(payload) {
    setLoading(true)
    setError('')

    try {
      const response = await loginUser(payload)
      onLoginSuccess?.(response)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPasswordSubmit(event) {
    event.preventDefault()
    if (forgotLoading) {
      return
    }

    setForgotLoading(true)
    setError('')
    setForgotMessage('')

    try {
      const response = await forgotPassword({ email: forgotEmail })
      setForgotMessage(response.message)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setForgotLoading(false)
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

  return (
    <section className="auth-content">
      <div className="auth-heading">
        <h2>Iniciar sesión</h2>
        <p>Ingresá con tu DNI y contraseña para continuar.</p>
      </div>

      <LoginForm
        onSubmit={handleLogin}
        onForgotPassword={() => setShowForgotForm((current) => !current)}
        loading={loading}
      />

      {showForgotForm && (
        <form className="auth-form" onSubmit={handleForgotPasswordSubmit}>
          <label className="auth-field">
            <span>Email para recuperación</span>
            <input
              type="email"
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              placeholder="tuemail@ejemplo.com"
              required
            />
          </label>
          <button className="auth-submit" type="submit" disabled={forgotLoading}>
            {forgotLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>
      )}

      {forgotMessage && (
        <p className="auth-message success" role="status">
          {forgotMessage}
        </p>
      )}

      {error && (
        <p className="auth-message error" role="alert">
          {error}
        </p>
      )}
      <p className="auth-switch-copy">
        ¿Aún no estás registrado?{' '}
        <button type="button" onClick={onSwitchToRegister}>
          Registrate
        </button>
      </p>
    </section>
  )
}

export default LoginPage
