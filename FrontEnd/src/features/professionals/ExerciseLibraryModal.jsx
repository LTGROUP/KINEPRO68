import { useMemo, useState } from 'react'
import { ArrowLeft, Search, X } from 'lucide-react'

import {
  TREATMENT_AREA_LABELS,
  getCatalogExercises,
  getMuscleZones,
  getTreatmentAreas,
} from './exerciseCatalogUtils'

function ExerciseLibraryModal({ catalog, onClose, onSelect }) {
  const [selectedArea, setSelectedArea] = useState('')
  const [selectedZone, setSelectedZone] = useState('')
  const [searchText, setSearchText] = useState('')

  const areas = getTreatmentAreas(catalog)
  const zones = getMuscleZones(catalog, selectedArea)
  const exercises = useMemo(() => {
    const catalogExercises = getCatalogExercises(catalog, selectedArea, selectedZone)
    const normalizedSearch = searchText.trim().toLowerCase()

    if (!normalizedSearch) {
      return catalogExercises
    }

    return catalogExercises.filter((exercise) => {
      return exercise.nombre.toLowerCase().includes(normalizedSearch)
    })
  }, [catalog, searchText, selectedArea, selectedZone])

  function handleBack() {
    if (selectedZone) {
      setSelectedZone('')
      setSearchText('')
      return
    }

    setSelectedArea('')
    setSearchText('')
  }

  let stepTitle = 'Seleccionar tren'
  if (selectedArea && !selectedZone) {
    stepTitle = 'Seleccionar zona muscular'
  }
  if (selectedZone) {
    stepTitle = selectedZone
  }

  return (
    <div className="exercise-library-backdrop">
      <section className="exercise-library-modal" aria-label="Biblioteca de ejercicios">
        <header>
          <div>
            <span>Biblioteca de ejercicios</span>
            <h3>{stepTitle}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar biblioteca">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {selectedArea && (
          <button type="button" className="exercise-library-back" onClick={handleBack}>
            <ArrowLeft size={17} aria-hidden="true" />
            Volver
          </button>
        )}

        {!selectedArea && (
          <div className="exercise-library-options">
            {areas.map((area) => (
              <button type="button" key={area} onClick={() => setSelectedArea(area)}>
                <strong>{TREATMENT_AREA_LABELS[area] || area}</strong>
                <span>Ver zonas musculares</span>
              </button>
            ))}
          </div>
        )}

        {selectedArea && !selectedZone && (
          <div className="exercise-library-options">
            {zones.map((zone) => (
              <button type="button" key={zone} onClick={() => setSelectedZone(zone)}>
                <strong>{zone}</strong>
                <span>Ver ejercicios</span>
              </button>
            ))}
          </div>
        )}

        {selectedArea && selectedZone && (
          <>
            <label className="exercise-library-search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Buscar ejercicio"
                autoFocus
              />
            </label>

            <div className="exercise-library-list">
              {!exercises.length && (
                <p>No se encontraron ejercicios para esta búsqueda.</p>
              )}

              {exercises.map((exercise) => (
                <button
                  type="button"
                  key={`${exercise.area_tratamiento}-${exercise.zona_muscular}-${exercise.nombre}`}
                  onClick={() => onSelect(exercise)}
                >
                  <strong>{exercise.nombre}</strong>
                  <span>
                    {TREATMENT_AREA_LABELS[exercise.area_tratamiento]} ·{' '}
                    {exercise.zona_muscular}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default ExerciseLibraryModal
