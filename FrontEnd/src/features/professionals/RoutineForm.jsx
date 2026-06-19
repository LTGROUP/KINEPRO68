import { useEffect, useState } from 'react'
import { CalendarDays, LayoutGrid, Plus } from 'lucide-react'

import RoutineBoardModal from './RoutineBoardModal'
import { getExerciseCatalog } from '../../services/exerciseCatalogService'
import {
  addClientIds,
  createEmptyExercise,
} from './routineExerciseUtils'

function formatDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addMonths(date, months) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function addYears(date, years) {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}

function getDaysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const difference = end.getTime() - start.getTime()
  return Math.ceil(difference / (1000 * 60 * 60 * 24))
}

function getDurationText(startDate, endDate) {
  if (!startDate || !endDate) {
    return 'Sin calcular'
  }

  const days = getDaysBetween(startDate, endDate)

  if (days < 0) {
    return 'Fechas inválidas'
  }

  if (days === 0) {
    return '1 día'
  }

  if (days < 30) {
    return `${days + 1} días`
  }

  const months = Math.round((days + 1) / 30)

  if (months === 1) {
    return '1 mes'
  }

  return `${months} meses`
}

function getDayCount(frequency) {
  const dayCounts = {
    '1 vez por semana': 1,
    '2 veces por semana': 2,
    '3 veces por semana': 3,
    '4 veces por semana': 4,
    Diaria: 5,
  }

  return dayCounts[frequency] || 0
}

function getInitialExercises(initialData) {
  if (!initialData?.ejercicios?.length) {
    return []
  }

  const exercises = initialData.ejercicios.map((exercise) => {
    return {
      ejercicio_catalogo_id: exercise.ejercicio_catalogo_id || null,
      nombre: exercise.nombre || '',
      area_tratamiento: exercise.area_tratamiento || '',
      zona_muscular: exercise.zona_muscular || '',
      series: exercise.series || 1,
      repeticiones: exercise.repeticiones || 1,
      descanso: exercise.descanso || '60 segundos',
      observaciones: exercise.observaciones || '',
      dia: exercise.dia || 1,
      bloque_orden: exercise.bloque_orden || 1,
    }
  })

  return addClientIds(exercises)
}

function getInitialDayCount(initialData) {
  if (!initialData?.ejercicios?.length) {
    return 1
  }

  let highestDay = 1

  for (const exercise of initialData.ejercicios) {
    const exerciseDay = exercise.dia || 1

    if (exerciseDay > highestDay) {
      highestDay = exerciseDay
    }
  }

  return highestDay
}

function RoutineForm({
  actor,
  patient,
  loading,
  onSubmit,
  initialData = null,
  mode = 'create',
}) {
  const today = formatDateInput(new Date())
  const defaultEndDate = formatDateInput(addMonths(new Date(), 1))
  const maxEndDate = formatDateInput(addYears(new Date(), 1))

  const [form, setForm] = useState(() => {
    return {
      objetivo: initialData?.titulo || '',
      frecuencia: initialData?.frecuencia || '',
      fecha_inicio: initialData?.fecha_inicio || today,
      fecha_fin: initialData?.fecha_fin || defaultEndDate,
      indicaciones_generales: initialData?.indicaciones_generales || '',
    }
  })
  const [exercises, setExercises] = useState(() => getInitialExercises(initialData))
  const [visibleDayCount, setVisibleDayCount] = useState(() => {
    return getInitialDayCount(initialData)
  })
  const [showBoard, setShowBoard] = useState(false)
  const [formError, setFormError] = useState('')
  const [catalog, setCatalog] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [boardSnapshot, setBoardSnapshot] = useState(null)

  const maximumDayCount = getDayCount(form.frecuencia)
  const days = []

  for (let day = 1; day <= visibleDayCount; day += 1) {
    days.push(day)
  }

  useEffect(() => {
    let isMounted = true

    async function loadCatalog() {
      setCatalogLoading(true)
      setCatalogError('')

      try {
        const response = await getExerciseCatalog(actor)

        if (isMounted) {
          setCatalog(response.items || [])
        }
      } catch (requestError) {
        if (isMounted) {
          setCatalogError(requestError.message)
        }
      } finally {
        if (isMounted) {
          setCatalogLoading(false)
        }
      }
    }

    Promise.resolve().then(loadCatalog)

    return () => {
      isMounted = false
    }
  }, [actor])

  function handleInputChange(event) {
    const { name, value } = event.target

    if (name === 'frecuencia') {
      const nextDayCount = getDayCount(value)
      const hasExercisesOutsideFrequency = exercises.some((exercise) => {
        return exercise.dia > nextDayCount
      })

      if (hasExercisesOutsideFrequency) {
        setFormError(
          `No se puede reducir la frecuencia a ${value} porque hay ejercicios en días posteriores`,
        )
        return
      }
    }

    setForm((currentForm) => {
      return {
        ...currentForm,
        [name]: value,
      }
    })

    if (name === 'frecuencia') {
      const nextDayCount = getDayCount(value)

      setVisibleDayCount((currentDayCount) => {
        if (currentDayCount > nextDayCount) {
          return nextDayCount
        }

        return Math.max(currentDayCount, 1)
      })
    }

    setFormError('')
  }

  function handleOpenBoard() {
    if (!form.frecuencia) {
      setFormError('Primero debe seleccionar una frecuencia')
      return
    }

    setFormError('')
    setBoardSnapshot({
      exercises: exercises.map((exercise) => ({ ...exercise })),
      visibleDayCount,
    })
    setShowBoard(true)
  }

  function handleAddFirstExercise() {
    if (!form.frecuencia) {
      setFormError('Primero debe seleccionar una frecuencia')
      return
    }

    if (!exercises.length) {
      setExercises([createEmptyExercise(1)])
    }

    setFormError('')
    setBoardSnapshot({
      exercises: exercises.length
        ? exercises.map((exercise) => ({ ...exercise }))
        : [],
      visibleDayCount,
    })
    setShowBoard(true)
  }

  function handleSaveBoard() {
    setBoardSnapshot(null)
    setShowBoard(false)
  }

  function handleCancelBoard() {
    if (boardSnapshot) {
      setExercises(boardSnapshot.exercises)
      setVisibleDayCount(boardSnapshot.visibleDayCount)
    }

    setBoardSnapshot(null)
    setShowBoard(false)
  }

  function handleAddDay() {
    setVisibleDayCount((currentDayCount) => {
      if (currentDayCount >= maximumDayCount) {
        return currentDayCount
      }

      return currentDayCount + 1
    })
  }

  function handleRemoveDay() {
    setVisibleDayCount((currentDayCount) => {
      return Math.max(1, currentDayCount - 1)
    })
  }

  function validateRoutine() {
    if (mode === 'create' && form.fecha_inicio < today) {
      return 'La fecha de inicio no puede ser anterior al día de hoy'
    }

    if (form.fecha_fin < form.fecha_inicio) {
      return 'La fecha de finalización debe ser posterior o igual a la fecha de inicio'
    }

    if (form.fecha_fin > maxEndDate) {
      return 'La fecha de finalización no puede superar un año desde hoy'
    }

    if (!exercises.length) {
      return 'Debe agregar al menos un ejercicio a la rutina'
    }

    for (const day of days) {
      const dayHasExercises = exercises.some((exercise) => exercise.dia === day)

      if (!dayHasExercises) {
        return `El día ${day} debe tener al menos un ejercicio`
      }
    }

    for (const exercise of exercises) {
      if (!exercise.nombre.trim()) {
        return 'Todos los ejercicios deben tener un nombre'
      }

      if (!exercise.area_tratamiento) {
        return `Debe seleccionar el tren de "${exercise.nombre}"`
      }

      if (!exercise.zona_muscular) {
        return `Debe seleccionar la zona muscular de "${exercise.nombre}"`
      }

      if (Number(exercise.series) < 1) {
        return 'Las series deben ser mayores o iguales a 1'
      }

      if (Number(exercise.repeticiones) < 1) {
        return 'Las repeticiones deben ser mayores o iguales a 1'
      }
    }

    return ''
  }

  function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const validationError = validateRoutine()

    if (validationError) {
      setFormError(validationError)
      return
    }

    const routineExercises = exercises.map((exercise, index) => {
      return {
        ejercicio_catalogo_id: exercise.ejercicio_catalogo_id || null,
        nombre: exercise.nombre.trim(),
        area_tratamiento: exercise.area_tratamiento,
        zona_muscular: exercise.zona_muscular,
        series: Number(exercise.series),
        repeticiones: Number(exercise.repeticiones),
        descanso: exercise.descanso,
        observaciones: exercise.observaciones || null,
        dia: exercise.dia,
        bloque_orden: exercise.bloque_orden,
        orden: index + 1,
      }
    })

    const payload = {
      paciente_id: patient.id,
      titulo: form.objetivo,
      frecuencia: form.frecuencia,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      indicaciones_generales: form.indicaciones_generales,
      ejercicios: routineExercises,
    }

    onSubmit(payload)
  }

  return (
    <>
      <form className="auth-form profile-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Objetivo de la rutina</span>
          <input
            type="text"
            name="objetivo"
            value={form.objetivo}
            onChange={handleInputChange}
            placeholder="Ej: Rehabilitación de rodilla"
            required
          />
        </label>

        <label className="auth-field">
          <span>Frecuencia</span>
          <select
            name="frecuencia"
            value={form.frecuencia}
            onChange={handleInputChange}
            required
          >
            <option value="" disabled hidden>
              Seleccionar frecuencia
            </option>
            <option value="1 vez por semana">1 vez por semana</option>
            <option value="2 veces por semana">2 veces por semana</option>
            <option value="3 veces por semana">3 veces por semana</option>
            <option value="4 veces por semana">4 veces por semana</option>
            <option value="Diaria">Diaria</option>
          </select>
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="auth-field">
            <span>Desde</span>
            <input
              type="date"
              name="fecha_inicio"
              value={form.fecha_inicio}
              min={mode === 'edit' ? initialData?.fecha_inicio : today}
              max={maxEndDate}
              onChange={handleInputChange}
              required
            />
          </label>

          <label className="auth-field">
            <span>Hasta</span>
            <input
              type="date"
              name="fecha_fin"
              value={form.fecha_fin}
              min={form.fecha_inicio || today}
              max={maxEndDate}
              onChange={handleInputChange}
              required
            />
          </label>
        </div>

        <div className="routine-duration-summary">
          <CalendarDays size={18} aria-hidden="true" />
          <span>
            Duración estimada:{' '}
            <strong>{getDurationText(form.fecha_inicio, form.fecha_fin)}</strong>
          </span>
        </div>

        <label className="auth-field">
          <span>Indicaciones / observaciones</span>
          <textarea
            name="indicaciones_generales"
            value={form.indicaciones_generales}
            onChange={handleInputChange}
            placeholder="Ej: realizar sin dolor, controlar postura..."
            rows="3"
          />
        </label>

        <section className="routine-builder-summary">
          <div className="routine-builder-heading">
            <div>
              <span>Ejercicios</span>
              <h3>
                {exercises.length
                  ? `${exercises.length} ejercicios organizados`
                  : 'Armá la rutina por días'}
              </h3>
            </div>
            <LayoutGrid size={24} aria-hidden="true" />
          </div>

          {maximumDayCount > 0 && exercises.length > 0 && (
            <div className="routine-day-summary">
              {days.map((day) => {
                const totalForDay = exercises.filter(
                  (exercise) => exercise.dia === day,
                ).length

                return (
                  <span key={day}>
                    Día {day}: <strong>{totalForDay}</strong>
                  </span>
                )
              })}
            </div>
          )}

          <button
            type="button"
            className="routine-open-board"
            onClick={exercises.length ? handleOpenBoard : handleAddFirstExercise}
          >
            {exercises.length ? (
              <LayoutGrid size={18} aria-hidden="true" />
            ) : (
              <Plus size={18} aria-hidden="true" />
            )}
            {exercises.length ? 'Abrir organizador' : 'Agregar ejercicios'}
          </button>
        </section>

        {formError && (
          <p className="auth-message error" role="alert">
            {formError}
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading
            ? mode === 'edit'
              ? 'Actualizando rutina...'
              : 'Guardando rutina...'
            : mode === 'edit'
              ? 'Actualizar rutina'
              : 'Guardar rutina'}
        </button>
      </form>

      {showBoard && (
        <RoutineBoardModal
          days={days}
          exercises={exercises}
          catalog={catalog}
          catalogLoading={catalogLoading}
          catalogError={catalogError}
          maximumDayCount={maximumDayCount}
          onAddDay={handleAddDay}
          onRemoveDay={handleRemoveDay}
          onChange={setExercises}
          onSave={handleSaveBoard}
          onCancel={handleCancelBoard}
        />
      )}
    </>
  )
}

export default RoutineForm
