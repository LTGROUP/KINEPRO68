import { useState } from 'react'
import PhoneInput from 'react-phone-number-input'

import CountryCodeSelect from '../auth/CountryCodeSelect'

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
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildInitialValues(initialData) {
  if (!initialData) {
    return {
      nombre: initialValues.nombre,
      apellido: initialValues.apellido,
      dni: initialValues.dni,
      telefono: initialValues.telefono,
      email: initialValues.email,
      obra_social: initialValues.obra_social,
      fecha_nacimiento: getTodayInputValue(),
    }
  }

  return {
    nombre: initialData.nombre || '',
    apellido: initialData.apellido || '',
    dni: initialData.dni || '',
    telefono: initialData.telefono || '',
    email: initialData.email || '',
    obra_social: initialData.obra_social || '',
    fecha_nacimiento: initialData.fecha_nacimiento || '',
  }
}

function getSubmitButtonText(loading, isEditMode) {
  if (loading) {
    if (isEditMode) {
      return 'Guardando...'
    }

    return 'Registrando...'
  }

  if (isEditMode) {
    return 'Guardar cambios'
  }

  return 'Registrar paciente'
}

function PatientForm({ initialData = null, loading = false, mode = 'create', onSubmit }) {
  const [values, setValues] = useState(() => buildInitialValues(initialData))
  const todayInputValue = getTodayInputValue()
  const isEditMode = mode === 'edit'
  const submitButtonText = getSubmitButtonText(loading, isEditMode)

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

  function handleSubmit(event) {
    event.preventDefault()

    if (loading) {
      return
    }

    const payload = {
      nombre: values.nombre,
      apellido: values.apellido,
      telefono: values.telefono,
      email: values.email,
      obra_social: values.obra_social,
      fecha_nacimiento: values.fecha_nacimiento,
    }

    if (!isEditMode) {
      payload.dni = values.dni
    }

    onSubmit(payload)
  }

  return (
    <form
      className="staff-member-form"
      onSubmit={handleSubmit}
      aria-busy={loading}
      autoComplete="on"
    >
      <fieldset className="staff-form-fields" disabled={loading}>
        <label className="staff-form-field">
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

        <label className="staff-form-field">
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

        <label className="staff-form-field">
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
            disabled={isEditMode}
            required
          />
        </label>

        <label className="staff-form-field">
          <span>Teléfono</span>
          <PhoneInput
            className="phone-input"
            countrySelectComponent={CountryCodeSelect}
            international={false}
            defaultCountry="AR"
            value={values.telefono}
            autoComplete="tel"
            onChange={handlePhoneChange}
            disabled={loading}
            required
          />
        </label>

        <label className="staff-form-field full">
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

        <label className="staff-form-field">
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

        <label className="staff-form-field">
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

      <button className="staff-form-submit" type="submit" disabled={loading}>
        {submitButtonText}
      </button>
    </form>
  )
}

export default PatientForm
