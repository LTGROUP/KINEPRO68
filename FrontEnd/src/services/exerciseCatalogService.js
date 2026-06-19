import { buildActorHeaders, request } from './authService'


export function getExerciseCatalog(actor) {
  return request('/api/v1/exercise-catalog?limit=1000', {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}
