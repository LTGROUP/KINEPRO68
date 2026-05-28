import { useEffect, useState } from 'react'

import { forgotPassword } from '../../services/authService'

function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    if (loading) {
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await forgotPassword({ email })
      setMessage(response.message)
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
        <h2>Recuperar contraseña</h2>
        <p>Ingresá tu email y te enviaremos un enlace para crear una nueva contraseña.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="usuario@email.com"
            autoComplete="email"
            required
          />
        </label>

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>

      {message && (
        <p className="auth-message success" role="status">
          {message}
        </p>
      )}

      {error && (
        <p className="auth-message error" role="alert">
          {error}
        </p>
      )}

      <p className="auth-switch-copy">
        <button type="button" onClick={onBackToLogin}>
          Volver al inicio de sesión
        </button>
      </p>
    </section>
  )
}

export default ForgotPasswordPage
