import { useState } from 'react'

import { registerUser } from '../../services/authService'
import RegisterForm from './RegisterForm'

function RegisterPage({ onSwitchToLogin }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleRegister(payload) {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await registerUser(payload)
      setSuccess(`${response.message}. Ya podés iniciar sesión.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
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
      {success && <p className="auth-message success">{success}</p>}

      <p className="auth-switch-copy">
        ¿Ya tenés cuenta?{' '}
        <button type="button" onClick={onSwitchToLogin}>
          Iniciá sesión
        </button>
      </p>
    </section>
  )
}

export default RegisterPage
