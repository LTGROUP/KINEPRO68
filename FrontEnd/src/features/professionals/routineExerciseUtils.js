function createClientId() {
  return `exercise-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createEmptyExercise(day = 1, block = 1) {
  return {
    client_id: createClientId(),
    ejercicio_catalogo_id: null,
    nombre: '',
    area_tratamiento: '',
    zona_muscular: '',
    series: 1,
    repeticiones: 1,
    descanso: '60 segundos',
    observaciones: '',
    dia: day,
    bloque_orden: block,
  }
}

export function addClientIds(exercises) {
  return exercises.map((exercise) => {
    return {
      ...exercise,
      client_id: exercise.client_id || createClientId(),
    }
  })
}
