import { useState } from 'react'

import { loginUser } from '../../services/authService'
import LoginForm from './LoginForm'

function LoginPage({ onSwitchToRegister }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  async function handleLogin(payload) {
    setLoading(true)
    setError('')
    setUser(null)

    try {
      const response = await loginUser(payload)
      setUser(response)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

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
      {user && (
        <p className="auth-message success">
          Bienvenido, {user.nombre}. Ya podés continuar.
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
