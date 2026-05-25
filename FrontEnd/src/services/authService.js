let apiBaseUrl = import.meta.env.VITE_API_BASE_URL

if (!apiBaseUrl) {
  apiBaseUrl = 'http://127.0.0.1:8000'
}

export const API_BASE_URL = apiBaseUrl

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
    headers: {
      'Content-Type': 'application/json',
    },
    body: normalizedBody,
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

    throw new Error(getErrorMessage(detail))
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

export function resetPassword(payload) {
  return request('/api/v1/auth/reset-password', {
    method: 'POST',
    body: payload,
  })
}
