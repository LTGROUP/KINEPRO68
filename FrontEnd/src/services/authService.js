const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

function getErrorMessage(detail) {
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

async function request(path, options) {
  // Centraliza los fetch para que login y registro manejen respuestas/errores igual.
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(getErrorMessage(data.detail))
  }

  return data
}

export function registerUser(payload) {
  return request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function loginUser(payload) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
