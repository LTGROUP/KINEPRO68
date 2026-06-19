export const TREATMENT_AREA_LABELS = {
  tren_superior: 'Tren superior',
  tren_medio: 'Tren medio',
  tren_inferior: 'Tren inferior',
}

export function getTreatmentAreas() {
  return Object.keys(TREATMENT_AREA_LABELS)
}

export function getMuscleZones(catalog, area) {
  const zones = new Set()

  for (const exercise of catalog) {
    if (exercise.area_tratamiento === area) {
      zones.add(exercise.zona_muscular)
    }
  }

  return [...zones].sort()
}

export function getCatalogExercises(catalog, area = '', zone = '') {
  return catalog.filter((exercise) => {
    const matchesArea = !area || exercise.area_tratamiento === area
    const matchesZone = !zone || exercise.zona_muscular === zone
    return matchesArea && matchesZone
  })
}

export function searchCatalogExercises(catalog, searchText, limit = 3) {
  const normalizedSearch = searchText.trim().toLowerCase()

  if (!normalizedSearch) {
    return []
  }

  const matches = []

  for (const exercise of catalog) {
    if (exercise.nombre.toLowerCase().includes(normalizedSearch)) {
      matches.push(exercise)
    }

    if (matches.length === limit) {
      break
    }
  }

  return matches
}
