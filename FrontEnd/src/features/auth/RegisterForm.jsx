import { useState } from 'react'
import PhoneInput from 'react-phone-number-input'

import CountryCodeSelect from './CountryCodeSelect'
import 'react-phone-number-input/style.css'

const initialValues = {
  nombre: '',
  apellido: '',
  dni: '',
  telefono: '',
  email: '',
  obra_social: '',
  fecha_nacimiento: '',
}

function getTodayInputValue() {
  // El input date espera formato YYYY-MM-DD; esto permite bloquear fechas futuras.
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function RegisterForm({ onSubmit, loading = false }) {
  const [values, setValues] = useState(initialValues)
  const todayInputValue = getTodayInputValue()

  function handleChange(event) {
    const { name, value } = event.target

    setValues((currentValues) => {
      const nextValues = {
        nombre: currentValues.nombre,
        apellido: currentValues.apellido,
        dni: currentValues.dni,
        telefono: currentValues.telefono,
        email: currentValues.email,
        obra_social: currentValues.obra_social,
        fecha_nacimiento: currentValues.fecha_nacimiento,
      }

      nextValues[name] = value

      return nextValues
    })
  }

  function handlePhoneChange(value) {
    let phoneValue = ''

    if (value) {
      phoneValue = value
    }

    setValues((currentValues) => {
      return {
        nombre: currentValues.nombre,
        apellido: currentValues.apellido,
        dni: currentValues.dni,
        telefono: phoneValue,
        email: currentValues.email,
        obra_social: currentValues.obra_social,
        fecha_nacimiento: currentValues.fecha_nacimiento,
      }
    })
  }

  function getSubmitText() {
    if (loading) {
      return 'Creando cuenta...'
    }

    return 'Registrarse'
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (loading) {
      // Evita enviar dos registros si el usuario toca el botón varias veces.
      return
    }

    onSubmit(values)
  }

  return (
    <form
      className="auth-form register-form"
      onSubmit={handleSubmit}
      aria-busy={loading}
      autoComplete="on"
    >
      <fieldset className="auth-form-fields" disabled={loading}>
        <label className="auth-field">
          <span>Nombre</span>
          <input
            name="nombre"
            type="text"
            value={values.nombre}
            onChange={handleChange}
            placeholder="Nombre"
            autoComplete="given-name"
            required
          />
        </label>

        <label className="auth-field">
          <span>Apellido</span>
          <input
            name="apellido"
            type="text"
            value={values.apellido}
            onChange={handleChange}
            placeholder="Apellido"
            autoComplete="family-name"
            required
          />
        </label>

        <label className="auth-field">
          <span>DNI</span>
          <input
            name="dni"
            type="text"
            value={values.dni}
            onChange={handleChange}
            placeholder="12345678"
            autoComplete="off"
            inputMode="numeric"
            pattern="[0-9]*"
            required
          />
        </label>

        <label className="auth-field">
          <span>Teléfono</span>
          <PhoneInput
            className="phone-input"
            countrySelectComponent={CountryCodeSelect}
            // La librería guarda el teléfono completo con prefijo, pero no duplica el +54 en el input.
            international={false}
            defaultCountry="AR"
            value={values.telefono}
            autoComplete="tel"
            onChange={handlePhoneChange}
            disabled={loading}
            required
          />
        </label>

        <label className="auth-field full">
          <span>Email</span>
          <input
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            placeholder="usuario@email.com"
            autoComplete="email"
            inputMode="email"
            required
          />
        </label>

        <label className="auth-field">
          <span>Obra social</span>
          <input
            name="obra_social"
            type="text"
            value={values.obra_social}
            onChange={handleChange}
            placeholder="Sin obra social"
            autoComplete="organization"
          />
        </label>

        <label className="auth-field">
          <span>Fecha de nacimiento</span>
          <input
            name="fecha_nacimiento"
            type="date"
            value={values.fecha_nacimiento}
            onChange={handleChange}
            max={todayInputValue}
            autoComplete="bday"
            required
          />
        </label>

      </fieldset>

      <button className="auth-submit full" type="submit" disabled={loading}>
        {loading && <span className="button-spinner" aria-hidden="true" />}
        {getSubmitText()}
      </button>
    </form>
  )
}

export default RegisterForm
