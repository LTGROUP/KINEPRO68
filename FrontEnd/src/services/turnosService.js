import { request } from './authService'

function buildActorHeaders(actor) {
  return {
    Authorization: `Bearer ${actor.access_token}`,
  }
}

export function getTurnosDisponibles(fecha) {
  return request(`/api/v1/turnos/disponibles?fecha=${fecha}`, {
    method: 'GET',
  })
}

export function solicitarTurno(actor, payload) {
  return request('/api/v1/turnos/solicitar', {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

// Registro manual de turno por la secretaria a nombre de un paciente
export function registrarTurnoManual(actor, payload) {
  return request('/api/v1/turnos/registrar-manual', {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function getMisTurnos(actor) {
  return request('/api/v1/turnos/mis-turnos', {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export function getListaEspera(actor, turnoId) {
  return request(`/api/v1/turnos/${turnoId}/lista-espera`, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export const inscribirseListaEspera = async (user, turno_id, area_tratamiento) => {
  const token = user?.access_token || user?.token;

  console.log('🔍 Debug Token:', {
    access_token: !!user?.access_token,
    token: !!user?.token,
    tokenUsado: token ? 'SÍ' : 'NO'
  });

  const response = await fetch(`/api/v1/turnos/${turno_id}/lista-espera`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      area_tratamiento: area_tratamiento
    }),
  });

  const errorData = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('❌ Error backend:', errorData);
    throw new Error(errorData.detail || 'Error al inscribirse en lista de espera');
  }

  console.log('✅ Éxito en lista de espera:', errorData);
  return errorData;
};

export function generarGrilla(actor, payload) {
  return request('/api/v1/grilla/generar', {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function bloquearDia(actor, payload) {
  return request('/api/v1/grilla/bloquear-dia', {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function getAgendaDia(actor, fecha, area = '') {
  let url = `/api/v1/turnos/agenda?fecha=${fecha}`
  if (area) {
    url += `&area=${area}`
  }
  return request(url, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

export function actualizarEstadoTurno(actor, turnoId, payload) {
  return request(`/api/v1/turnos/${turnoId}/asistencia`, {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function getTurnosParaPaciente(fecha) {
  return request(`/api/v1/turnos/paciente?fecha=${fecha}`, {
    method: 'GET',
  })
}

export const getAuthHeader = (user) => {
  const token = user?.access_token || user?.token;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

// ---> FUNCIONES AGREGADAS PARA REPROGRAMAR Y CANCELAR <---
export async function cancelarTurno(actor, turnoId) {
  const token = actor?.access_token || actor?.token
  
  const response = await fetch(`/api/v1/turnos/${turnoId}/cancelar`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.detail || 'Error al cancelar el turno')
  }

  return data
}

export function reprogramarTurno(actor, turnoId, payload) {
  return request(`/api/v1/turnos/${turnoId}/reprogramar`, {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

export function getTodosLosTurnos(actor, fecha) {
  return request(`/api/v1/turnos/todos?fecha=${fecha}`, {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}

// HU-15: Pantalla pública de aceptar/rechazar turno
export function getTurnoInfoPorToken(token) {
  return fetch(`/api/v1/turnos/lista-espera/info?token=${encodeURIComponent(token)}`)
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) throw new Error(data.detail || 'Error al obtener info del turno')
      return data
    })
}

export function aceptarTurnoPorToken(token) {
  return fetch(`/api/v1/turnos/lista-espera/aceptar?token=${encodeURIComponent(token)}`, {
    method: 'POST',
  })
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) throw new Error(data.detail || 'Error al aceptar el turno')
      return data
    })
}

export function rechazarTurnoPorToken(token) {
  return fetch(`/api/v1/turnos/lista-espera/rechazar?token=${encodeURIComponent(token)}`, {
    method: 'POST',
  })
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) throw new Error(data.detail || 'Error al rechazar el turno')
      return data
    })
}

// HU-14: Secretaria cancela turno de un paciente
export function cancelarTurnoSecretaria(actor, turnoId) {
  return request(`/api/v1/turnos/${turnoId}/cancelar-secretaria`, {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
  })
}

// HU-12: Secretaria inscribe paciente en lista de espera
export function inscribirPacienteListaEsperaSecretaria(actor, turnoId, payload) {
  return request(`/api/v1/turnos/${turnoId}/lista-espera/secretaria`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
    body: payload,
  })
}

// HU-13: Secretaria cancela inscripción en lista de espera
export function cancelarInscripcionListaEsperaSecretaria(actor, inscripcionId) {
  return request(`/api/v1/turnos/lista-espera/${inscripcionId}/cancelar-secretaria`, {
    method: 'PATCH',
    headers: buildActorHeaders(actor),
  })
}

// HU-5: Reporte de ausentismo
export function getReporteAusentismo(actor, fechaDesde, fechaHasta) {
  return request(
    `/api/v1/turnos/reportes/ausentismo?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`,
    {
      method: 'GET',
      headers: buildActorHeaders(actor),
    }
  )
}

export function getListaEsperaActivas(actor) {
  return request('/api/v1/turnos/lista-espera/activas', {
    method: 'GET',
    headers: buildActorHeaders(actor),
  })
}