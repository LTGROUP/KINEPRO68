import { useEffect, useState } from 'react'

import { loginUser } from '../../services/authService'
import LoginForm from './LoginForm'

function LoginPage({ onLoginSuccess, onSwitchToRegister }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      <LoginForm onSubmit={handleLogin} loading={loading} />

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
