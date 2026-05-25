import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const initialValues = {
  dni: '',
  password: '',
}

function LoginForm({ onSubmit, onForgotPassword, loading = false }) {
  const [values, setValues] = useState(initialValues)
  const [showPassword, setShowPassword] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target

    setValues((currentValues) => {
      const nextValues = {
        dni: currentValues.dni,
        password: currentValues.password,
      }

      nextValues[name] = value

      return nextValues
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (loading) {
      // Evita dobles envíos mientras esperamos la respuesta del backend.
      return
    }

    onSubmit(values)
  }

  function handleTogglePassword() {
    setShowPassword((currentValue) => !currentValue)
  }

  function getPasswordInputType() {
    if (showPassword) {
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

  function getSubmitText() {
    if (loading) {
      return 'Ingresando...'
    }

    return 'Iniciar sesión'
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading} autoComplete="on">
      <fieldset className="auth-form-fields" disabled={loading}>
        <label className="auth-field">
          <span>DNI</span>
          <input
            name="dni"
            type="text"
            value={values.dni}
            onChange={handleChange}
            autoComplete="username"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="12345678"
            required
          />
        </label>

        <label className="auth-field">
          <span>Contraseña</span>
          <div className="password-input-wrap">
            <input
              name="password"
              type={getPasswordInputType()}
              value={values.password}
              onChange={handleChange}
              autoComplete="current-password"
              placeholder="Tu contraseña"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={handleTogglePassword}
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
      </fieldset>

      <button className="auth-submit" type="submit" disabled={loading}>
        {loading && <span className="button-spinner" aria-hidden="true" />}
        {getSubmitText()}
      </button>

      <button className="auth-link" type="button" onClick={onForgotPassword} disabled={loading}>
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  )
}

export default LoginForm
