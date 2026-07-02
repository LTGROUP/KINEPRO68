import { useState } from 'react'
import { ArrowLeft, CalendarDays, Pencil, Trash2, X } from 'lucide-react'

import { TREATMENT_AREA_LABELS } from './exerciseCatalogUtils'
import '../../styles/routine-detail.css'

function getRoutineDays(exercises) {
  const dayNumbers = new Set()

  for (const exercise of exercises) {
    dayNumbers.add(exercise.dia || 1)
  }

  return [...dayNumbers].sort((firstDay, secondDay) => firstDay - secondDay)
}

function getBlocksForDay(exercises, day) {
  const blockNumbers = new Set()

  for (const exercise of exercises) {
    if ((exercise.dia || 1) === day) {
      blockNumbers.add(exercise.bloque_orden || 1)
    }
  }

  return [...blockNumbers].sort((firstBlock, secondBlock) => {
    return firstBlock - secondBlock
  })
}

function getExercisesForBlock(exercises, day, block) {
  return exercises.filter((exercise) => {
    return (
      (exercise.dia || 1) === day &&
      (exercise.bloque_orden || 1) === block
    )
  })
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Sin fecha'
  }

  const dateParts = dateValue.split('-')

  if (dateParts.length !== 3) {
    return dateValue
  }

  return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
}

function ExerciseItem({ exercise }) {
  return (
    <article className="routine-detail-exercise">
      <strong>{exercise.nombre}</strong>
      <p>
        {exercise.series} series · {exercise.repeticiones} repeticiones
      </p>
      <span>Descanso: {exercise.descanso}</span>
      {(exercise.area_tratamiento || exercise.zona_muscular) && (
        <span className="routine-detail-zone">
          {TREATMENT_AREA_LABELS[exercise.area_tratamiento] ||
            exercise.area_tratamiento ||
            'Sin tren'}
          {exercise.zona_muscular ? ` · ${exercise.zona_muscular}` : ''}
        </span>
      )}
      {exercise.observaciones && <small>{exercise.observaciones}</small>}
    </article>
  )
}

function RoutineDayContent({ day, exercises }) {
  const blocks = getBlocksForDay(exercises, day)

  return (
    <section className="routine-detail-day">
      <header>
        <span>Día {day}</span>
        <strong>
          {blocks.length} bloques ·{' '}
          {exercises.filter((exercise) => (exercise.dia || 1) === day).length}{' '}
          ejercicios
        </strong>
      </header>

      <div className="routine-detail-blocks">
        {blocks.map((block) => {
          const blockExercises = getExercisesForBlock(exercises, day, block)

          return (
            <section className="routine-detail-block" key={block}>
              <div className="routine-detail-block-title">
                <strong>Bloque {block}</strong>
                <span>{blockExercises.length} ejercicios</span>
              </div>

              <div className="routine-detail-exercises">
                {blockExercises.map((exercise) => (
                  <ExerciseItem key={exercise.id || exercise.client_id} exercise={exercise} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}

function RoutineDetailModal({
  routine,
  canManage,
  canEdit = canManage,
  canDelete = canManage,
  deleting,
  onClose,
  onEdit,
  onDelete,
}) {
  const [selectedMobileDay, setSelectedMobileDay] = useState(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const exercises = routine.ejercicios || []
  const days = getRoutineDays(exercises)

  return (
    <div className="routine-detail-backdrop">
      <section className="routine-detail-modal" aria-label="Detalle de rutina">
        <header className="routine-detail-header">
          <div>
            <span>Rutina activa</span>
            <h2>{routine.titulo}</h2>
            <p>{routine.indicaciones_generales || 'Sin indicaciones generales'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar detalle">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="routine-detail-summary">
          <div>
            <CalendarDays size={18} aria-hidden="true" />
            <span>
              {formatDate(routine.fecha_inicio)} al {formatDate(routine.fecha_fin)}
            </span>
          </div>
          <strong>{routine.frecuencia}</strong>
          <span>{exercises.length} ejercicios</span>
        </div>

        <div className="routine-detail-desktop-grid">
          {days.map((day) => (
            <RoutineDayContent key={day} day={day} exercises={exercises} />
          ))}
        </div>

        <div className="routine-detail-mobile">
          {selectedMobileDay === null ? (
            <div className="routine-mobile-day-list">
              {days.map((day) => {
                const dayExercises = exercises.filter((exercise) => {
                  return (exercise.dia || 1) === day
                })
                const blockCount = getBlocksForDay(exercises, day).length

                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => setSelectedMobileDay(day)}
                  >
                    <div>
                      <strong>Día {day}</strong>
                      <span>
                        {blockCount} bloques · {dayExercises.length} ejercicios
                      </span>
                    </div>
                    <span aria-hidden="true">›</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="routine-mobile-day-detail">
              <button
                type="button"
                className="routine-mobile-back"
                onClick={() => setSelectedMobileDay(null)}
              >
                <ArrowLeft size={18} aria-hidden="true" />
                Volver a los días
              </button>
              <RoutineDayContent day={selectedMobileDay} exercises={exercises} />
            </div>
          )}
        </div>

        {(canEdit || canDelete) && (
          <footer className="routine-detail-actions">
            {canEdit && (
              <button type="button" className="primary" onClick={onEdit}>
                <Pencil size={17} aria-hidden="true" />
                Editar rutina
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                className="danger"
                onClick={() => setShowDeleteConfirmation(true)}
                disabled={deleting}
              >
                <Trash2 size={17} aria-hidden="true" />
                {deleting ? 'Eliminando...' : 'Eliminar rutina'}
              </button>
            )}
          </footer>
        )}

        {showDeleteConfirmation && (
          <div className="routine-delete-confirmation-backdrop">
            <section
              className="routine-delete-confirmation"
              aria-label="Confirmar eliminación de rutina"
            >
              <span>Eliminar rutina</span>
              <h3>¿Querés eliminar “{routine.titulo}”?</h3>
              <p>
                La rutina dejará de estar activa y el paciente ya no podrá
                consultarla.
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmation(false)}
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={onDelete}
                  disabled={deleting}
                >
                  <Trash2 size={17} aria-hidden="true" />
                  {deleting ? 'Eliminando...' : 'Eliminar rutina'}
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  )
}

export default RoutineDetailModal
