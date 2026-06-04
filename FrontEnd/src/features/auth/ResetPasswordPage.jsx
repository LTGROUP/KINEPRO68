import { useEffect, useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'

import { getSupabaseConfigError, supabase } from '../../lib/supabase/client'

function ResetPasswordPage({ onFinish }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (!success) {
      return
    }

    const redirectTimer = window.setTimeout(() => {
      onFinish()
    }, 2200)

    return () => {
      window.clearTimeout(redirectTimer)
    }
  }, [success, onFinish])

  function getFriendlyErrorMessage(message) {
    if (!message) {
      return 'No se pudo actualizar la contraseña'
    }

    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('new password should be different')) {
      return 'La nueva contraseña debe ser diferente a la anterior.'
    }

    if (lowerMessage.includes('password should be at least')) {
      return 'La contraseña debe tener al menos 8 caracteres.'
    }

    if (lowerMessage.includes('session')) {
      return 'La sesión de recuperación venció. Pedí un nuevo enlace.'
    }

    return message
  }

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
      const configError = getSupabaseConfigError()

      if (configError) {
        throw new Error(configError)
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess('Contraseña actualizada con éxito.')
    } catch (requestError) {
      setError(getFriendlyErrorMessage(requestError.message))
    } finally {
      setLoading(false)
    }
  }

  function togglePasswordVisibility() {
    setShowPassword((currentValue) => !currentValue)
  }

  function toggleConfirmPasswordVisibility() {
    setShowConfirmPassword((currentValue) => !currentValue)
  }

  function getPasswordInputType() {
    if (showPassword) {
      return 'text'
    }

    return 'password'
  }

  function getConfirmPasswordInputType() {
    if (showConfirmPassword) {
      return 'text'
    }

    return 'password'
  }

  function getPasswordButtonLabel() {
    if (showPassword) {
      return 'Ocultar contraseña'
    }

    return 'Mostrar contraseña'
  }

  function getConfirmPasswordButtonLabel() {
    if (showConfirmPassword) {
      return 'Ocultar confirmación de contraseña'
    }

    return 'Mostrar confirmación de contraseña'
  }

  return (
    <main className="auth-shell reset-password-shell">
      <section
        className="auth-panel reset-password-panel"
        data-open="true"
        aria-label="Recuperar contraseña"
      >
        <section className="auth-content">
          <div className="reset-password-icon" aria-hidden="true">
            <LockKeyhole size={30} strokeWidth={2.8} />
          </div>

          <div className="auth-heading">
            <h2>Crear nueva contraseña</h2>
            <p>Elegí una contraseña nueva para volver a acceder a KinePro.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Nueva contraseña</span>
              <div className="password-input-wrap">
                <input
                  type={getPasswordInputType()}
                  placeholder="Nueva contraseña"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  aria-label={getPasswordButtonLabel()}
                >
                  {showPassword ? (
                    <EyeOff size={20} strokeWidth={2.4} aria-hidden="true" />
                  ) : (
                    <Eye size={20} strokeWidth={2.4} aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>

            <label className="auth-field">
              <span>Confirmar contraseña</span>
              <div className="password-input-wrap">
                <input
                  type={getConfirmPasswordInputType()}
                  placeholder="Repetí la contraseña"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={toggleConfirmPasswordVisibility}
                  aria-label={getConfirmPasswordButtonLabel()}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} strokeWidth={2.4} aria-hidden="true" />
                  ) : (
                    <Eye size={20} strokeWidth={2.4} aria-hidden="true" />
                  )}
                </button>
              </div>
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
              Volver a iniciar sesión
            </button>
          </p>
        </section>
      </section>
    </main>
  )
}

export default ResetPasswordPage
