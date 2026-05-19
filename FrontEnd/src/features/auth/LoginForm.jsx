import { useState } from 'react'

const initialValues = {
  dni: '',
  password: '',
}

function LoginForm({ onSubmit, loading = false }) {
  const [values, setValues] = useState(initialValues)
  const [showPassword, setShowPassword] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (loading) {
      // Evita dobles envíos mientras esperamos la respuesta del backend.
      return
    }

    onSubmit(values)
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
      <fieldset className="auth-form-fields" disabled={loading}>
        <label className="auth-field">
          <span>DNI</span>
          <input
            name="dni"
            type="text"
            value={values.dni}
            onChange={handleChange}
            autoComplete="username"
            placeholder="44751138"
            required
          />
        </label>

        <label className="auth-field">
          <span>Contraseña</span>
          <div className="password-input-wrap">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={values.password}
              onChange={handleChange}
              autoComplete="current-password"
              placeholder="Tu contraseña"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((currentValue) => !currentValue)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.1 5.4A9.4 9.4 0 0 1 12 5c5 0 8.4 4.1 9.5 5.7a2.2 2.2 0 0 1 0 2.6 16.7 16.7 0 0 1-2.1 2.5" />
                  <path d="M6.1 6.8a16.8 16.8 0 0 0-3.6 3.9 2.2 2.2 0 0 0 0 2.6C3.6 14.9 7 19 12 19a9.7 9.7 0 0 0 4.1-.9" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 10.7a2.2 2.2 0 0 0 0 2.6C3.6 14.9 7 19 12 19s8.4-4.1 9.5-5.7a2.2 2.2 0 0 0 0-2.6C20.4 9.1 17 5 12 5s-8.4 4.1-9.5 5.7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>
      </fieldset>

      <button className="auth-submit" type="submit" disabled={loading}>
        {loading && <span className="button-spinner" aria-hidden="true" />}
        {loading ? 'Ingresando...' : 'Iniciar sesión'}
      </button>

      <button className="auth-link" type="button" disabled>
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  )
}

export default LoginForm
