import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

import ExerciseLibraryModal from './ExerciseLibraryModal'
import {
  TREATMENT_AREA_LABELS,
  getMuscleZones,
  getTreatmentAreas,
  searchCatalogExercises,
} from './exerciseCatalogUtils'
import { createEmptyExercise } from './routineExerciseUtils'
import '../../styles/routine-board.css'

function getExercisesForBlock(exercises, day, block) {
  return exercises.filter((exercise) => {
    return exercise.dia === day && exercise.bloque_orden === block
  })
}

function findExerciseIndex(exercises, exerciseId) {
  return exercises.findIndex((exercise) => exercise.client_id === exerciseId)
}

function getInitialBlocks(days, exercises) {
  const blocksByDay = {}

  for (const day of days) {
    let highestBlock = 1

    for (const exercise of exercises) {
      if (exercise.dia === day && exercise.bloque_orden > highestBlock) {
        highestBlock = exercise.bloque_orden
      }
    }

    const blocks = []
    for (let block = 1; block <= highestBlock; block += 1) {
      blocks.push(block)
    }

    blocksByDay[day] = blocks
  }

  return blocksByDay
}

function SortableExerciseCard({ exercise, onEdit, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: exercise.client_id,
    data: {
      day: exercise.dia,
      block: exercise.bloque_orden,
      type: 'exercise',
    },
  })

  const cardStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  let cardClassName = 'routine-board-card'
  if (isDragging) {
    cardClassName += ' dragging'
  }

  return (
    <article ref={setNodeRef} style={cardStyle} className={cardClassName}>
      <button
        type="button"
        className="routine-drag-handle"
        aria-label={`Mover ${exercise.nombre || 'ejercicio'}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} aria-hidden="true" />
      </button>

      <button
        type="button"
        className="routine-card-content"
        onClick={() => onEdit(exercise.client_id)}
      >
        <strong>{exercise.nombre || 'Ejercicio sin nombre'}</strong>
        <span>
          {exercise.series} series · {exercise.repeticiones} repeticiones ·{' '}
          {exercise.descanso}
        </span>
        {(exercise.area_tratamiento || exercise.zona_muscular) && (
          <small>
            {TREATMENT_AREA_LABELS[exercise.area_tratamiento] ||
              exercise.area_tratamiento ||
              'Sin tren'}
            {exercise.zona_muscular ? ` · ${exercise.zona_muscular}` : ''}
          </small>
        )}
      </button>

      <div className="routine-card-actions">
        <button
          type="button"
          onClick={() => onEdit(exercise.client_id)}
          aria-label={`Editar ${exercise.nombre || 'ejercicio'}`}
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => onRemove(exercise.client_id)}
          aria-label={`Eliminar ${exercise.nombre || 'ejercicio'}`}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}

function RoutineBlock({
  day,
  block,
  exercises,
  canRemove,
  onAddExercise,
  onEditExercise,
  onRemoveExercise,
  onRemoveBlock,
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: `day-${day}-block-${block}`,
    data: {
      day,
      block,
      type: 'block',
    },
  })

  const blockStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  let blockClassName = 'routine-block'
  if (isOver) {
    blockClassName += ' over'
  }
  if (isDragging) {
    blockClassName += ' dragging'
  }

  const exerciseIds = exercises.map((exercise) => exercise.client_id)

  return (
    <section ref={setSortableNodeRef} style={blockStyle} className={blockClassName}>
      <header className="routine-block-header">
        <div className="routine-block-title">
          <button
            type="button"
            className="routine-block-drag-handle"
            aria-label={`Mover bloque ${block}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={17} aria-hidden="true" />
          </button>
          <div>
            <strong>Bloque {block}</strong>
            <span>{exercises.length} ejercicios</span>
          </div>
        </div>

        <div className="routine-block-actions">
          <button
            type="button"
            onClick={() => onAddExercise(day, block)}
            title={`Agregar ejercicio al bloque ${block}`}
          >
            <Plus size={16} aria-hidden="true" />
          </button>

          {canRemove && (
            <button
              type="button"
              className="danger"
              onClick={() => onRemoveBlock(day, block)}
              title={`Eliminar bloque ${block}`}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <SortableContext items={exerciseIds} strategy={verticalListSortingStrategy}>
        <div className="routine-block-list">
          {!exercises.length && (
            <button
              type="button"
              className="routine-empty-block"
              onClick={() => onAddExercise(day, block)}
            >
              Soltá un ejercicio acá o agregá uno
            </button>
          )}

          {exercises.map((exercise) => (
            <SortableExerciseCard
              key={exercise.client_id}
              exercise={exercise}
              onEdit={onEditExercise}
              onRemove={onRemoveExercise}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  )
}

function RoutineDayColumn({
  day,
  blocks,
  exercises,
  isActive,
  onAddBlock,
  onAddExercise,
  onEditExercise,
  onRemoveExercise,
  onRemoveBlock,
  onRemoveDay,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `day-${day}`,
    data: {
      day,
      type: 'day',
    },
  })

  const columnStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  let columnClassName = 'routine-board-column'
  if (isActive) {
    columnClassName += ' active'
  }
  if (isDragging) {
    columnClassName += ' dragging'
  }

  return (
    <section ref={setNodeRef} style={columnStyle} className={columnClassName}>
      <header className="routine-column-header">
        <div className="routine-day-title">
          <button
            type="button"
            className="routine-day-drag-handle"
            aria-label={`Mover día ${day}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={18} aria-hidden="true" />
          </button>
          <div>
            <span>Día {day}</span>
            <strong>
              {blocks.length} bloques · {exercises.length} ejercicios
            </strong>
          </div>
        </div>
        <div className="routine-day-actions">
          <button type="button" onClick={() => onAddBlock(day)} title="Agregar bloque">
            <Plus size={18} aria-hidden="true" />
          </button>
          {onRemoveDay && (
            <button
              type="button"
              className="danger"
              onClick={() => onRemoveDay(day)}
              title={`Eliminar día ${day}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <SortableContext
        items={blocks.map((block) => `day-${day}-block-${block}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="routine-column-list">
          {blocks.map((block) => (
            <RoutineBlock
              key={block}
              day={day}
              block={block}
              exercises={getExercisesForBlock(exercises, day, block)}
              canRemove={blocks.length > 1}
              onAddExercise={onAddExercise}
              onEditExercise={onEditExercise}
              onRemoveExercise={onRemoveExercise}
              onRemoveBlock={onRemoveBlock}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  )
}

function ExerciseEditor({
  exercise,
  catalog,
  days,
  blocksByDay,
  onChange,
  onClose,
  onRemove,
  onOpenLibrary,
}) {
  if (!exercise) {
    return null
  }

  const availableBlocks = blocksByDay[exercise.dia] || [1]
  const treatmentAreas = getTreatmentAreas()
  const muscleZones = getMuscleZones(catalog, exercise.area_tratamiento)
  const muscleZoneListId = `muscle-zones-${exercise.client_id}`
  const suggestions = searchCatalogExercises(catalog, exercise.nombre, 3).filter(
    (suggestion) => suggestion.nombre !== exercise.nombre,
  )

  function handleChange(event) {
    const { name, value } = event.target
    let nextValue = value

    if (
      name === 'series' ||
      name === 'repeticiones' ||
      name === 'dia' ||
      name === 'bloque_orden'
    ) {
      nextValue = Number(value)
    }

    onChange(exercise.client_id, name, nextValue)
  }

  function handleSuggestion(suggestion) {
    onChange(exercise.client_id, 'catalog_exercise', suggestion)
  }

  return (
    <div className="routine-editor-backdrop">
      <section className="routine-exercise-editor" aria-label="Editar ejercicio">
        <header>
          <div>
            <span>Ejercicio</span>
            <h3>{exercise.nombre || 'Nuevo ejercicio'}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar editor">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="routine-editor-fields">
          <div className="exercise-name-field">
            <label className="auth-field">
              <span>Nombre</span>
              <div className="exercise-name-input">
                <input
                  type="text"
                  name="nombre"
                  value={exercise.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Elevación lateral de hombro"
                  autoComplete="off"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={onOpenLibrary}
                  aria-label="Buscar en biblioteca de ejercicios"
                  title="Buscar ejercicio"
                >
                  <Search size={18} aria-hidden="true" />
                </button>
              </div>
            </label>

            {suggestions.length > 0 && (
              <div className="exercise-suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={`${suggestion.area_tratamiento}-${suggestion.zona_muscular}-${suggestion.nombre}`}
                    onClick={() => handleSuggestion(suggestion)}
                  >
                    <strong>{suggestion.nombre}</strong>
                    <span>
                      {TREATMENT_AREA_LABELS[suggestion.area_tratamiento]} ·{' '}
                      {suggestion.zona_muscular}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="routine-editor-grid">
            <label className="auth-field">
              <span>Tren</span>
              <select
                name="area_tratamiento"
                value={exercise.area_tratamiento}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar tren</option>
                {treatmentAreas.map((area) => (
                  <option key={area} value={area}>
                    {TREATMENT_AREA_LABELS[area] || area}
                  </option>
                ))}
              </select>
            </label>

            <label className="auth-field">
              <span>Zona muscular</span>
              <input
                type="text"
                name="zona_muscular"
                value={exercise.zona_muscular}
                onChange={handleChange}
                list={muscleZoneListId}
                disabled={!exercise.area_tratamiento}
                placeholder="Ej: Hombros"
                required
              />
              <datalist id={muscleZoneListId}>
                {muscleZones.map((zone) => (
                  <option key={zone} value={zone}>
                  </option>
                ))}
              </datalist>
            </label>
          </div>

          <div className="routine-editor-grid">
            <label className="auth-field">
              <span>Día</span>
              <select name="dia" value={exercise.dia} onChange={handleChange}>
                {days.map((day) => (
                  <option key={day} value={day}>
                    Día {day}
                  </option>
                ))}
              </select>
            </label>

            <label className="auth-field">
              <span>Bloque</span>
              <select
                name="bloque_orden"
                value={exercise.bloque_orden}
                onChange={handleChange}
              >
                {availableBlocks.map((block) => (
                  <option key={block} value={block}>
                    Bloque {block}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="routine-editor-grid">
            <label className="auth-field">
              <span>Series</span>
              <input
                type="number"
                name="series"
                min="1"
                value={exercise.series}
                onChange={handleChange}
                required
              />
            </label>

            <label className="auth-field">
              <span>Repeticiones</span>
              <input
                type="number"
                name="repeticiones"
                min="1"
                value={exercise.repeticiones}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <label className="auth-field">
            <span>Descanso</span>
            <select name="descanso" value={exercise.descanso} onChange={handleChange}>
              <option value="Sin descanso">Sin descanso</option>
              <option value="15 segundos">15 segundos</option>
              <option value="30 segundos">30 segundos</option>
              <option value="45 segundos">45 segundos</option>
              <option value="60 segundos">60 segundos</option>
              <option value="90 segundos">90 segundos</option>
              <option value="120 segundos">120 segundos</option>
            </select>
          </label>

          <label className="auth-field">
            <span>Observaciones</span>
            <textarea
              name="observaciones"
              value={exercise.observaciones}
              onChange={handleChange}
              placeholder="Ej: controlar postura y evitar dolor"
              rows="3"
            />
          </label>
        </div>

        <footer>
          <button
            type="button"
            className="routine-editor-delete"
            onClick={() => onRemove(exercise.client_id)}
          >
            <Trash2 size={17} aria-hidden="true" />
            Eliminar
          </button>
          <button type="button" className="routine-editor-done" onClick={onClose}>
            Listo
          </button>
        </footer>
      </section>
    </div>
  )
}

function RoutineBoardModal({
  days,
  exercises,
  catalog,
  catalogLoading,
  catalogError,
  maximumDayCount,
  onChange,
  onSave,
  onCancel,
  onAddDay,
  onRemoveDay,
}) {
  const [activeMobileDay, setActiveMobileDay] = useState(days[0] || 1)
  const [editingExerciseId, setEditingExerciseId] = useState(null)
  const [blockPendingRemoval, setBlockPendingRemoval] = useState(null)
  const [dayPendingRemoval, setDayPendingRemoval] = useState(null)
  const [organizationError, setOrganizationError] = useState('')
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false)
  const [blocksByDay, setBlocksByDay] = useState(() => {
    return getInitialBlocks(days, exercises)
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const editingExercise = exercises.find((exercise) => {
    return exercise.client_id === editingExerciseId
  })

  function handleAddVisibleDay() {
    if (days.length >= maximumDayCount) {
      return
    }

    const nextDay = days.length + 1
    onAddDay()
    setActiveMobileDay(nextDay)
    setOrganizationError('')
  }

  function removeDay(dayToRemove) {
    const updatedExercises = []

    for (const exercise of exercises) {
      if (exercise.dia === dayToRemove) {
        continue
      }

      if (exercise.dia > dayToRemove) {
        updatedExercises.push({
          ...exercise,
          dia: exercise.dia - 1,
        })
      } else {
        updatedExercises.push(exercise)
      }
    }

    setBlocksByDay((currentBlocks) => {
      const updatedBlocks = {}

      for (const dayText in currentBlocks) {
        const currentDay = Number(dayText)

        if (currentDay === dayToRemove) {
          continue
        }

        const nextDay = currentDay > dayToRemove ? currentDay - 1 : currentDay
        updatedBlocks[nextDay] = currentBlocks[currentDay]
      }

      return updatedBlocks
    })

    onChange(updatedExercises)
    onRemoveDay()
    setDayPendingRemoval(null)
    setEditingExerciseId(null)
    setOrganizationError('')
    setActiveMobileDay((currentDay) => {
      if (currentDay > dayToRemove) {
        return currentDay - 1
      }

      if (currentDay === dayToRemove) {
        return Math.max(1, dayToRemove - 1)
      }

      return currentDay
    })
  }

  function handleRemoveDay(day) {
    if (days.length === 1) {
      setOrganizationError('La rutina debe conservar al menos un día')
      return
    }

    const dayExercises = exercises.filter((exercise) => exercise.dia === day)

    if (dayExercises.length > 0) {
      setDayPendingRemoval({
        day,
        exerciseCount: dayExercises.length,
      })
      return
    }

    removeDay(day)
  }

  function handleAddBlock(day) {
    setBlocksByDay((currentBlocks) => {
      const dayBlocks = currentBlocks[day] || [1]
      const nextBlock = dayBlocks.length + 1

      return {
        ...currentBlocks,
        [day]: [...dayBlocks, nextBlock],
      }
    })
  }

  function removeBlock(day, blockToRemove) {
    const updatedExercises = []

    for (const exercise of exercises) {
      if (exercise.dia === day && exercise.bloque_orden === blockToRemove) {
        continue
      }

      if (exercise.dia === day && exercise.bloque_orden > blockToRemove) {
        updatedExercises.push({
          ...exercise,
          bloque_orden: exercise.bloque_orden - 1,
        })
      } else {
        updatedExercises.push(exercise)
      }
    }

    setBlocksByDay((currentBlocks) => {
      const updatedBlocks = currentBlocks[day]
        .filter((block) => block !== blockToRemove)
        .map((block) => {
          if (block > blockToRemove) {
            return block - 1
          }

          return block
        })

      return {
        ...currentBlocks,
        [day]: updatedBlocks,
      }
    })

    onChange(updatedExercises)
    setEditingExerciseId(null)
    setBlockPendingRemoval(null)
  }

  function handleRemoveBlock(day, block) {
    const blockExercises = getExercisesForBlock(exercises, day, block)

    if (blockExercises.length > 0) {
      setBlockPendingRemoval({
        day,
        block,
        exerciseCount: blockExercises.length,
      })
      return
    }

    removeBlock(day, block)
  }

  function handleAddExercise(day, block) {
    const newExercise = createEmptyExercise(day, block)
    onChange([...exercises, newExercise])
    setActiveMobileDay(day)
    setEditingExerciseId(newExercise.client_id)
    setOrganizationError('')
  }

  function handleExerciseChange(exerciseId, field, value) {
    const updatedExercises = exercises.map((exercise) => {
      if (exercise.client_id !== exerciseId) {
        return exercise
      }

      if (field === 'dia') {
        return {
          ...exercise,
          dia: value,
          bloque_orden: 1,
        }
      }

      if (field === 'area_tratamiento') {
        return {
          ...exercise,
          ejercicio_catalogo_id: null,
          area_tratamiento: value,
          zona_muscular: '',
        }
      }

      if (field === 'nombre') {
        return {
          ...exercise,
          ejercicio_catalogo_id: null,
          nombre: value,
        }
      }

      if (field === 'zona_muscular') {
        return {
          ...exercise,
          ejercicio_catalogo_id: null,
          zona_muscular: value,
        }
      }

      if (field === 'catalog_exercise') {
        return {
          ...exercise,
          ejercicio_catalogo_id: value.id,
          nombre: value.nombre,
          area_tratamiento: value.area_tratamiento,
          zona_muscular: value.zona_muscular,
        }
      }

      return {
        ...exercise,
        [field]: value,
      }
    })

    onChange(updatedExercises)

    if (field === 'dia') {
      setActiveMobileDay(value)
    }
  }

  function handleSelectLibraryExercise(catalogExercise) {
    if (!editingExerciseId) {
      return
    }

    handleExerciseChange(editingExerciseId, 'catalog_exercise', catalogExercise)
    setShowExerciseLibrary(false)
  }

  function handleRemoveExercise(exerciseId) {
    const updatedExercises = exercises.filter((exercise) => {
      return exercise.client_id !== exerciseId
    })

    onChange(updatedExercises)
    setEditingExerciseId(null)
  }

  function moveDay(sourceDay, targetDay) {
    const sourceIndex = days.indexOf(sourceDay)
    const targetIndex = days.indexOf(targetDay)

    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return
    }

    const reorderedDays = arrayMove(days, sourceIndex, targetIndex)
    const dayPositionMap = {}

    reorderedDays.forEach((oldDayNumber, index) => {
      dayPositionMap[oldDayNumber] = index + 1
    })

    const updatedExercises = exercises.map((exercise) => {
      return {
        ...exercise,
        dia: dayPositionMap[exercise.dia],
      }
    })
    const updatedBlocks = {}

    for (const oldDayText in blocksByDay) {
      const oldDay = Number(oldDayText)
      const newDay = dayPositionMap[oldDay]
      updatedBlocks[newDay] = blocksByDay[oldDay]
    }

    setBlocksByDay(updatedBlocks)
    onChange(updatedExercises)
    setActiveMobileDay(dayPositionMap[activeMobileDay])
  }

  function validateOrganization() {
    for (const day of days) {
      const dayHasExercises = exercises.some((exercise) => exercise.dia === day)

      if (!dayHasExercises) {
        return `El día ${day} debe tener al menos un ejercicio`
      }
    }

    for (const day of days) {
      const dayBlocks = blocksByDay[day] || []

      for (const block of dayBlocks) {
        const blockHasExercises = exercises.some((exercise) => {
          return exercise.dia === day && exercise.bloque_orden === block
        })

        if (!blockHasExercises) {
          return `El bloque ${block} del día ${day} debe tener al menos un ejercicio`
        }
      }
    }

    for (const exercise of exercises) {
      if (!exercise.nombre.trim()) {
        return 'Todos los ejercicios deben tener un nombre'
      }

      if (!exercise.area_tratamiento) {
        return `Debe seleccionar el tren de "${exercise.nombre}"`
      }

      if (!exercise.zona_muscular.trim()) {
        return `Debe seleccionar la zona muscular de "${exercise.nombre}"`
      }

      if (Number(exercise.series) < 1 || Number(exercise.repeticiones) < 1) {
        return `Las series y repeticiones de "${exercise.nombre}" deben ser mayores a cero`
      }
    }

    return ''
  }

  function handleSaveOrganization() {
    const validationError = validateOrganization()

    if (validationError) {
      setOrganizationError(validationError)
      return
    }

    setOrganizationError('')
    onSave()
  }

  function moveBlockWithinDay(day, sourceBlock, targetBlock) {
    const currentBlocks = blocksByDay[day] || [1]
    const sourceIndex = currentBlocks.indexOf(sourceBlock)
    const targetIndex = currentBlocks.indexOf(targetBlock)

    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return
    }

    const reorderedBlocks = arrayMove(currentBlocks, sourceIndex, targetIndex)
    const blockPositionMap = {}

    reorderedBlocks.forEach((oldBlockNumber, index) => {
      blockPositionMap[oldBlockNumber] = index + 1
    })

    const updatedExercises = exercises.map((exercise) => {
      if (exercise.dia !== day) {
        return exercise
      }

      return {
        ...exercise,
        bloque_orden: blockPositionMap[exercise.bloque_orden],
      }
    })

    setBlocksByDay((current) => {
      return {
        ...current,
        [day]: reorderedBlocks.map((_, index) => index + 1),
      }
    })
    onChange(updatedExercises)
  }

  function moveBlockToAnotherDay(sourceDay, sourceBlock, targetDay, targetBlock) {
    const sourceBlocks = blocksByDay[sourceDay] || [1]
    const targetBlocks = blocksByDay[targetDay] || [1]
    const targetIndex = Math.max(targetBlocks.indexOf(targetBlock), 0)
    const movedExercises = []
    const remainingExercises = []

    for (const exercise of exercises) {
      if (exercise.dia === sourceDay && exercise.bloque_orden === sourceBlock) {
        movedExercises.push(exercise)
      } else {
        remainingExercises.push(exercise)
      }
    }

    const sourceBlockMap = {}
    const remainingSourceBlocks = sourceBlocks.filter((block) => block !== sourceBlock)

    remainingSourceBlocks.forEach((oldBlockNumber, index) => {
      sourceBlockMap[oldBlockNumber] = index + 1
    })

    const updatedRemainingExercises = remainingExercises.map((exercise) => {
      if (exercise.dia === sourceDay) {
        return {
          ...exercise,
          bloque_orden: sourceBlockMap[exercise.bloque_orden],
        }
      }

      if (exercise.dia === targetDay && exercise.bloque_orden > targetIndex) {
        return {
          ...exercise,
          bloque_orden: exercise.bloque_orden + 1,
        }
      }

      return exercise
    })

    const targetBlockNumber = targetIndex + 1
    const updatedMovedExercises = movedExercises.map((exercise) => {
      return {
        ...exercise,
        dia: targetDay,
        bloque_orden: targetBlockNumber,
      }
    })

    setBlocksByDay((current) => {
      const normalizedSourceBlocks = remainingSourceBlocks.map((_, index) => index + 1)
      const nextTargetBlocks = [...targetBlocks]
      nextTargetBlocks.splice(targetIndex, 0, 0)

      return {
        ...current,
        [sourceDay]: normalizedSourceBlocks.length ? normalizedSourceBlocks : [1],
        [targetDay]: nextTargetBlocks.map((_, index) => index + 1),
      }
    })

    onChange([...updatedRemainingExercises, ...updatedMovedExercises])
    setActiveMobileDay(targetDay)
  }

  function handleDragEnd(event) {
    const { active, over } = event

    if (!over) {
      return
    }

    if (active.data.current?.type === 'block') {
      const sourceDay = Number(active.data.current.day)
      const sourceBlock = Number(active.data.current.block)
      const targetDay = Number(over.data.current?.day || sourceDay)
      const targetBlock = Number(over.data.current?.block || sourceBlock)

      if (sourceDay === targetDay) {
        moveBlockWithinDay(sourceDay, sourceBlock, targetBlock)
      } else {
        moveBlockToAnotherDay(sourceDay, sourceBlock, targetDay, targetBlock)
      }

      return
    }

    if (active.data.current?.type === 'day') {
      const sourceDay = Number(active.data.current.day)
      const targetDay = Number(over.data.current?.day || sourceDay)
      moveDay(sourceDay, targetDay)
      return
    }

    const oldIndex = findExerciseIndex(exercises, active.id)
    if (oldIndex < 0) {
      return
    }

    const activeExercise = exercises[oldIndex]
    const targetDay = Number(over.data.current?.day || activeExercise.dia)
    const requestedTargetBlock = Number(
      over.data.current?.block || activeExercise.bloque_orden,
    )
    const targetDayBlocks = blocksByDay[targetDay] || [1]
    let targetBlock = requestedTargetBlock

    if (!targetDayBlocks.includes(requestedTargetBlock)) {
      targetBlock = targetDayBlocks[0]
    }

    const updatedExercises = [...exercises]
    updatedExercises[oldIndex] = {
      ...activeExercise,
      dia: targetDay,
      bloque_orden: targetBlock,
    }

    const overIndex = findExerciseIndex(updatedExercises, over.id)
    let reorderedExercises = updatedExercises

    if (overIndex >= 0 && overIndex !== oldIndex) {
      reorderedExercises = arrayMove(updatedExercises, oldIndex, overIndex)
    }

    onChange(reorderedExercises)
    setActiveMobileDay(targetDay)
  }

  return (
    <div className="routine-board-backdrop">
      <section className="routine-board-modal" aria-label="Organizar ejercicios">
        <header className="routine-board-header">
          <div>
            <span>Constructor de rutina</span>
            <h2>Organizar ejercicios</h2>
            <p>
              Organizá la rutina por días y bloques. Arrastrá los ejercicios para
              cambiar su ubicación.
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cerrar sin guardar">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <nav className="routine-mobile-days" aria-label="Días de la rutina">
          {days.map((day) => (
            <button
              type="button"
              key={day}
              className={activeMobileDay === day ? 'active' : ''}
              onClick={() => setActiveMobileDay(day)}
            >
              Día {day}
            </button>
          ))}
          {days.length < maximumDayCount && (
            <button type="button" className="add-day" onClick={handleAddVisibleDay}>
              <Plus size={16} aria-hidden="true" />
              Día
            </button>
          )}
        </nav>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={days.map((day) => `day-${day}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="routine-board-grid">
              {days.map((day) => (
                <RoutineDayColumn
                  key={day}
                  day={day}
                  blocks={blocksByDay[day] || [1]}
                  exercises={exercises.filter((exercise) => exercise.dia === day)}
                  isActive={activeMobileDay === day}
                  onAddBlock={handleAddBlock}
                  onAddExercise={handleAddExercise}
                  onEditExercise={setEditingExerciseId}
                  onRemoveExercise={handleRemoveExercise}
                  onRemoveBlock={handleRemoveBlock}
                  onRemoveDay={days.length > 1 ? handleRemoveDay : null}
                />
              ))}

              {days.length < maximumDayCount && (
                <button
                  type="button"
                  className="routine-add-day-column"
                  onClick={handleAddVisibleDay}
                >
                  <Plus size={28} aria-hidden="true" />
                  <strong>Agregar día</strong>
                  <span>
                    Podés crear hasta {maximumDayCount} días distintos para esta
                    frecuencia.
                  </span>
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>

        <footer className="routine-board-footer">
          <span>{exercises.length} ejercicios cargados</span>
          <button type="button" onClick={handleSaveOrganization}>
            Guardar organización
          </button>
        </footer>

        <ExerciseEditor
          exercise={editingExercise}
          catalog={catalog}
          days={days}
          blocksByDay={blocksByDay}
          onChange={handleExerciseChange}
          onClose={() => setEditingExerciseId(null)}
          onRemove={handleRemoveExercise}
          onOpenLibrary={() => setShowExerciseLibrary(true)}
        />

        {showExerciseLibrary && (
          <ExerciseLibraryModal
            catalog={catalog}
            onClose={() => setShowExerciseLibrary(false)}
            onSelect={handleSelectLibraryExercise}
          />
        )}

        {catalogLoading && (
          <div className="routine-catalog-status">Cargando catálogo...</div>
        )}

        {catalogError && (
          <div className="routine-catalog-status error">{catalogError}</div>
        )}

        {blockPendingRemoval && (
          <div className="routine-confirm-backdrop">
            <section className="routine-confirm-card" aria-label="Confirmar eliminación">
              <span>Eliminar bloque</span>
              <h3>
                ¿Eliminar el bloque {blockPendingRemoval.block} del día{' '}
                {blockPendingRemoval.day}?
              </h3>
              <p>
                También se eliminarán sus {blockPendingRemoval.exerciseCount}{' '}
                ejercicios.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setBlockPendingRemoval(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() =>
                    removeBlock(
                      blockPendingRemoval.day,
                      blockPendingRemoval.block,
                    )
                  }
                >
                  Eliminar bloque
                </button>
              </div>
            </section>
          </div>
        )}

        {dayPendingRemoval && (
          <div className="routine-confirm-backdrop">
            <section className="routine-confirm-card" aria-label="Confirmar eliminación">
              <span>Eliminar día</span>
              <h3>¿Eliminar el día {dayPendingRemoval.day}?</h3>
              <p>
                También se eliminarán sus {dayPendingRemoval.exerciseCount}{' '}
                ejercicios.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setDayPendingRemoval(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => removeDay(dayPendingRemoval.day)}
                >
                  Eliminar día
                </button>
              </div>
            </section>
          </div>
        )}

        {organizationError && (
          <div className="routine-confirm-backdrop">
            <section
              className="routine-confirm-card routine-error-card"
              aria-label="No se pudo completar la acción"
            >
              <span>Error</span>
              <h3>No se pudo completar la acción</h3>
              <p>{organizationError}</p>
              <div>
                <button
                  type="button"
                  className="error-close"
                  onClick={() => setOrganizationError('')}
                  autoFocus
                >
                  Entendido
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  )
}

export default RoutineBoardModal
