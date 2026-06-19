let apiBaseUrl = import.meta.env.VITE_API_BASE_URL

if (!apiBaseUrl) {
  apiBaseUrl = 'http://127.0.0.1:8000'
}

export const API_BASE_URL = apiBaseUrl
export const SESSION_STORAGE_KEY = 'kinepro_session'
export const SESSION_EXPIRED_EVENT = 'kinepro:session-expired'
export const SESSION_REFRESHED_EVENT = 'kinepro:session-refreshed'

export function clearStoredSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY)
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
}

function isStoredSessionValid(session) {
  if (!session) {
    return false
  }

  if (typeof session !== 'object') {
    return false
  }

  if (!session.access_token) {
    return false
  }

  if (!session.refresh_token) {
    return false
  }

  if (!session.dni) {
    return false
  }

  if (!session.rol) {
    return false
  }

  return true
}

export function readStoredSession() {
  let storedSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  let storageArea = window.sessionStorage

  if (!storedSession) {
    storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY)
    storageArea = window.localStorage
  }

  if (!storedSession) {
    return null
  }

  try {
    const parsedSession = JSON.parse(storedSession)

    if (!isStoredSessionValid(parsedSession)) {
      storageArea.removeItem(SESSION_STORAGE_KEY)
      return null
    }

    return parsedSession
  } catch {
    storageArea.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function saveStoredSession(session, keepSession) {
  const sessionToSave = {
    message: session.message,
    user_id: session.user_id,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    nombre: session.nombre,
    apellido: session.apellido,
    dni: session.dni,
    rol: session.rol,
    keep_session: keepSession,
  }

  if (keepSession) {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionToSave))
    return sessionToSave
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY)
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionToSave))
  return sessionToSave
}

function notifySessionExpired() {
  clearStoredSession()
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

function notifySessionRefreshed(session) {
  window.dispatchEvent(
    new CustomEvent(SESSION_REFRESHED_EVENT, {
      detail: session,
    }),
  )
}

async function refreshStoredSession() {
  const storedSession = readStoredSession()

  if (!storedSession) {
    return null
  }

  if (!storedSession.keep_session) {
    return null
  }

  if (!storedSession.refresh_token) {
    return null
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: storedSession.refresh_token,
      }),
    })
  } catch {
    return null
  }

  if (!response.ok) {
    return null
  }

  const refreshedSession = await response.json()
  const savedSession = saveStoredSession(refreshedSession, true)
  notifySessionRefreshed(savedSession)
  return savedSession
}

export function getErrorMessage(detail) {
  // FastAPI puede devolver un string o una lista de errores de Pydantic.
  // En el front mostramos solo el primer error para no saturar al usuario.
  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    const [firstError] = detail

    if (firstError) {
      const message = firstError.msg.replace('Value error, ', '')
      return `${message}`
    }
  }

  return 'Ocurrió un error inesperado'
}

export async function request(path, options) {
  // Centraliza los fetch para que login y registro manejen respuestas/errores igual.
  let requestOptions = {}

  if (options) {
    requestOptions = options
  }

  let customHeaders = {}

  if (requestOptions.headers) {
    customHeaders = requestOptions.headers
  }

  let normalizedBody = requestOptions.body

  if (requestOptions.body && typeof requestOptions.body === 'object') {
    if (!(requestOptions.body instanceof FormData)) {
      normalizedBody = JSON.stringify(requestOptions.body)
    }
  }

  const fetchOptions = {
    method: requestOptions.method,
    headers: {},
    body: normalizedBody,
  }

  if (normalizedBody && !(normalizedBody instanceof FormData)) {
    fetchOptions.headers['Content-Type'] = 'application/json'
  }

  for (const headerName in customHeaders) {
    fetchOptions.headers[headerName] = customHeaders[headerName]
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, fetchOptions)
  } catch {
    // Evita mostrar mensajes tecnicos como "Failed to fetch" cuando no hay internet
    // o cuando el backend no esta respondiendo.
    if (navigator.onLine === false) {
      throw new Error('No hay conexión a internet')
    }

    throw new Error('Error de conexión con el servidor')
  }

  if (response.status === 401 && path !== '/api/v1/auth/refresh') {
    const refreshedSession = await refreshStoredSession()

    if (refreshedSession) {
      fetchOptions.headers.Authorization = `Bearer ${refreshedSession.access_token}`

      try {
        response = await fetch(`${API_BASE_URL}${path}`, fetchOptions)
      } catch {
        if (navigator.onLine === false) {
          throw new Error('No hay conexión a internet')
        }

        throw new Error('Error de conexión con el servidor')
      }
    }
  }

  if (requestOptions.responseType === 'blob' && response.ok) {
    return {
      blob: await response.blob(),
      headers: response.headers,
    }
  }

  const rawResponse = await response.text()
  let data

  try {
    if (rawResponse) {
      data = JSON.parse(rawResponse)
    } else {
      data = null
    }
  } catch {
    throw new Error('Ocurrió un error inesperado')
  }

  if (!response.ok) {
    let detail

    if (data) {
      detail = data.detail
    }

    if (response.status === 401) {
      notifySessionExpired()
    }

    const requestError = new Error(getErrorMessage(detail))
    requestError.status = response.status
    throw requestError
  }

  return data
}

export function registerUser(payload) {
  return request('/api/v1/auth/register', {
    method: 'POST',
    body: payload,
  })
}

export function loginUser(payload) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: payload,
  })
}

export function buildActorHeaders(actor) {
  if (!actor || !actor.access_token) {
    throw new Error('No se encontró una sesión activa')
  }

  return {
    Authorization: `Bearer ${actor.access_token}`,
  }
}

export function getMyProfile(actor) {
  return request('/api/v1/auth/me', {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export function updateMyProfile(actor, payload) {
  return request('/api/v1/auth/me', {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function changePassword(actor, payload) {
  return request('/api/v1/auth/change-password', {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function forgotPassword(payload) {
  return request('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: payload,
  })
}
