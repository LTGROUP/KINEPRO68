import { useState } from 'react'

import { supabase } from '../../lib/supabase/client'

function ResetPasswordPage({ onFinish }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return

    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess('Contraseña actualizada con éxito. Ya podés iniciar sesión.')
    } catch (requestError) {
      setError(requestError.message || 'No se pudo actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" data-open="true" aria-label="Recuperar contraseña">
        <section className="auth-content">
          <div className="auth-heading">
            <h2>Crear nueva contraseña</h2>
            <p>Ingresá tu nueva contraseña para recuperar el acceso a tu cuenta.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Nueva contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <label className="auth-field">
              <span>Confirmar contraseña</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>

          {error && (
            <p className="auth-message error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="auth-message success" role="status">
              {success}
            </p>
          )}

          <p className="auth-switch-copy">
            <button type="button" onClick={onFinish}>
              Volver al login
            </button>
          </p>
        </section>
      </section>
    </main>
  )
}

export default ResetPasswordPage
