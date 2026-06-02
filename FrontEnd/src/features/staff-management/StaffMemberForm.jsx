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
  rol: 'profesional',
  matricula: '',
  especialidad: '',
  area_tratamiento: 'tren inferior',
  horario_entrada: '08:00',
  horario_salida: '17:00',
}

function buildTimeOptions() {
  const options = []
  const firstHour = 7
  const totalOptions = 29

  for (let index = 0; index < totalOptions; index += 1) {
    const totalMinutes = firstHour * 60 + index * 30
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const minutes = String(totalMinutes % 60).padStart(2, '0')
    options.push(`${hours}:${minutes}`)
  }

  return options
}

const TIME_OPTIONS = buildTimeOptions()

const ROLE_OPTIONS_BY_ACTOR = {
  administrativo: [
    { label: 'Profesional', value: 'profesional' },
    { label: 'Secretaria', value: 'secretaria' },
    { label: 'Administrativo', value: 'administrativo' },
  ],
  secretaria: [
    { label: 'Profesional', value: 'profesional' },
    { label: 'Secretaria', value: 'secretaria' },
  ],
}

function TimePicker({ name, value, disabled, onChange }) {
  const [open, setOpen] = useState(false)

  function handleToggle() {
    setOpen((currentOpen) => !currentOpen)
  }

  function handleSelect(time) {
    onChange(name, time)
    setOpen(false)
  }

  function renderOptions() {
    const buttons = []

    for (const time of TIME_OPTIONS) {
      let optionClass = 'time-picker-option'
      const isSelected = time === value

      if (isSelected) {
        optionClass = 'time-picker-option active'
      }

      buttons.push(
        <button
          key={time}
          type="button"
          className={optionClass}
          onClick={() => handleSelect(time)}
          role="option"
          aria-selected={isSelected}
        >
          {time}
        </button>,
      )
    }

    return buttons
  }

  return (
    <div className="time-picker">
      <button
        type="button"
        className="time-picker-button"
        onClick={handleToggle}
        disabled={disabled}
        aria-expanded={open}
      >
        <span>{value}</span>
        <span aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className="time-picker-options" role="listbox">
          {renderOptions()}
        </div>
      )}
    </div>
  )
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
      rol: initialValues.rol,
      matricula: initialValues.matricula,
      especialidad: initialValues.especialidad,
      area_tratamiento: initialValues.area_tratamiento,
      horario_entrada: initialValues.horario_entrada,
      horario_salida: initialValues.horario_salida,
    }
  }

  let professionalData = {}

  if (initialData.profesional) {
    professionalData = initialData.profesional
  }

  let horarioEntrada = '08:00'
  let horarioSalida = '17:00'

  if (professionalData.horario_entrada) {
    horarioEntrada = professionalData.horario_entrada.slice(0, 5)
  }

  if (professionalData.horario_salida) {
    horarioSalida = professionalData.horario_salida.slice(0, 5)
  }

  return {
    nombre: initialData.nombre || '',
    apellido: initialData.apellido || '',
    dni: initialData.dni || '',
    telefono: initialData.telefono || '',
    email: initialData.email || '',
    obra_social: initialData.obra_social || '',
    fecha_nacimiento: initialData.fecha_nacimiento || '',
    rol: initialData.rol || 'profesional',
    matricula: professionalData.matricula || '',
    especialidad: professionalData.especialidad || '',
    area_tratamiento: professionalData.area_tratamiento || 'tren inferior',
    horario_entrada: horarioEntrada,
    horario_salida: horarioSalida,
  }
}

function isFieldInList(fieldName, fieldList) {
  for (const currentField of fieldList) {
    if (currentField === fieldName) {
      return true
    }
  }

  return false
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

  return 'Registrar miembro'
}

function StaffMemberForm({
  actorRole,
  initialData = null,
  loading = false,
  mode = 'create',
  onSubmit,
}) {
  const [values, setValues] = useState(() => buildInitialValues(initialData))
  const todayInputValue = getTodayInputValue()
  let roleOptions = ROLE_OPTIONS_BY_ACTOR.secretaria

  if (ROLE_OPTIONS_BY_ACTOR[actorRole]) {
    roleOptions = ROLE_OPTIONS_BY_ACTOR[actorRole]
  }

  const isEditMode = mode === 'edit'
  const isProfessional = values.rol === 'profesional'
  const submitButtonText = getSubmitButtonText(loading, isEditMode)

  function canEditField(fieldName) {
    if (!isEditMode) {
      return true
    }

    const commonEditableFields = ['telefono', 'email', 'obra_social']
    const professionalEditableFields = [
      'especialidad',
      'area_tratamiento',
      'horario_entrada',
      'horario_salida',
    ]

    if (isFieldInList(fieldName, commonEditableFields)) {
      return true
    }

    if (isProfessional && isFieldInList(fieldName, professionalEditableFields)) {
      return true
    }

    return false
  }

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
        rol: currentValues.rol,
        matricula: currentValues.matricula,
        especialidad: currentValues.especialidad,
        area_tratamiento: currentValues.area_tratamiento,
        horario_entrada: currentValues.horario_entrada,
        horario_salida: currentValues.horario_salida,
      }

      nextValues[name] = value

      return nextValues
    })
  }

  function handleTimeChange(name, value) {
    setValues((currentValues) => {
      const nextValues = {
        nombre: currentValues.nombre,
        apellido: currentValues.apellido,
        dni: currentValues.dni,
        telefono: currentValues.telefono,
        email: currentValues.email,
        obra_social: currentValues.obra_social,
        fecha_nacimiento: currentValues.fecha_nacimiento,
        rol: currentValues.rol,
        matricula: currentValues.matricula,
        especialidad: currentValues.especialidad,
        area_tratamiento: currentValues.area_tratamiento,
        horario_entrada: currentValues.horario_entrada,
        horario_salida: currentValues.horario_salida,
      }

      nextValues[name] = value

      return nextValues
    })
  }

  function handleRoleChange(event) {
    const rol = event.target.value

    setValues((currentValues) => {
      const nextValues = {
        nombre: currentValues.nombre,
        apellido: currentValues.apellido,
        dni: currentValues.dni,
        telefono: currentValues.telefono,
        email: currentValues.email,
        obra_social: currentValues.obra_social,
        fecha_nacimiento: currentValues.fecha_nacimiento,
        rol,
        matricula: currentValues.matricula,
        especialidad: currentValues.especialidad,
        area_tratamiento: currentValues.area_tratamiento,
        horario_entrada: currentValues.horario_entrada,
        horario_salida: currentValues.horario_salida,
      }

      if (rol === 'profesional') {
        nextValues.matricula = currentValues.matricula
        nextValues.especialidad = currentValues.especialidad
        nextValues.area_tratamiento = currentValues.area_tratamiento
        nextValues.horario_entrada = currentValues.horario_entrada
        nextValues.horario_salida = currentValues.horario_salida
      } else {
        nextValues.matricula = ''
        nextValues.especialidad = ''
        nextValues.area_tratamiento = 'tren inferior'
        nextValues.horario_entrada = '08:00'
        nextValues.horario_salida = '17:00'
      }

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
        rol: currentValues.rol,
        matricula: currentValues.matricula,
        especialidad: currentValues.especialidad,
        area_tratamiento: currentValues.area_tratamiento,
        horario_entrada: currentValues.horario_entrada,
        horario_salida: currentValues.horario_salida,
      }
    })
  }

  function renderRoleOptions() {
    const options = []

    for (const role of roleOptions) {
      options.push(
        <option key={role.value} value={role.value}>
          {role.label}
        </option>,
      )
    }

    return options
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (loading) {
      return
    }

    if (isEditMode) {
      const payload = {
        telefono: values.telefono,
        email: values.email,
        obra_social: values.obra_social,
      }

      if (isProfessional) {
        payload.especialidad = values.especialidad
        payload.area_tratamiento = values.area_tratamiento
        payload.horario_entrada = values.horario_entrada
        payload.horario_salida = values.horario_salida
      }

      onSubmit(payload)
      return
    }

    const payload = {
      nombre: values.nombre,
      apellido: values.apellido,
      dni: values.dni,
      telefono: values.telefono,
      email: values.email,
      obra_social: values.obra_social,
      fecha_nacimiento: values.fecha_nacimiento,
      rol: values.rol,
    }

    if (isProfessional) {
      payload.matricula = values.matricula
      payload.especialidad = values.especialidad
      payload.area_tratamiento = values.area_tratamiento
      payload.horario_entrada = values.horario_entrada
      payload.horario_salida = values.horario_salida
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
          <span>Rol</span>
          <select
            name="rol"
            value={values.rol}
            onChange={handleRoleChange}
            disabled={isEditMode}
            required
          >
            {renderRoleOptions()}
          </select>
        </label>

        <label className="staff-form-field">
          <span>Nombre</span>
          <input
            name="nombre"
            type="text"
            value={values.nombre}
            onChange={handleChange}
            placeholder="Nombre"
            autoComplete="given-name"
            disabled={!canEditField('nombre')}
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
            disabled={!canEditField('apellido')}
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
            disabled={!canEditField('dni')}
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
            disabled={loading || !canEditField('telefono')}
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
            disabled={!canEditField('email')}
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
            disabled={!canEditField('obra_social')}
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
            disabled={!canEditField('fecha_nacimiento')}
            required
          />
        </label>

        {isProfessional && (
          <div className="professional-extension">
            <label className="staff-form-field">
              <span>Matrícula</span>
              <input
                name="matricula"
                type="text"
                value={values.matricula}
                onChange={handleChange}
                placeholder="MP-123456"
                autoComplete="off"
                disabled={isEditMode}
                required
              />
            </label>

            <label className="staff-form-field">
              <span>Especialidad</span>
              <input
                name="especialidad"
                type="text"
                value={values.especialidad}
                onChange={handleChange}
                placeholder="Kinesiología deportiva"
                autoComplete="organization-title"
                disabled={!canEditField('especialidad')}
                required
              />
            </label>

            <label className="staff-form-field full">
              <span>Área de tratamiento</span>
              <select
                name="area_tratamiento"
                value={values.area_tratamiento}
                onChange={handleChange}
                disabled={!canEditField('area_tratamiento')}
                required
              >
                <option value="tren inferior">Tren inferior</option>
                <option value="tren medio">Tren medio</option>
                <option value="tren superior">Tren superior</option>
              </select>
            </label>

            <div className="staff-form-field">
              <span>Horario entrada</span>
              <TimePicker
                name="horario_entrada"
                value={values.horario_entrada}
                disabled={!canEditField('horario_entrada')}
                onChange={handleTimeChange}
              />
            </div>

            <div className="staff-form-field">
              <span>Horario salida</span>
              <TimePicker
                name="horario_salida"
                value={values.horario_salida}
                disabled={!canEditField('horario_salida')}
                onChange={handleTimeChange}
              />
            </div>
          </div>
        )}
      </fieldset>

      <button className="staff-form-submit" type="submit" disabled={loading}>
        {submitButtonText}
      </button>
    </form>
  )
}

export default StaffMemberForm
