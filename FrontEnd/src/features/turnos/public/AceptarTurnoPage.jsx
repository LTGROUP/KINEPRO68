import { useState, useEffect } from 'react'

const AREA_LABELS = {
  tren_superior: 'Tren superior',
  tren_medio: 'Tren medio',
  tren_inferior: 'Tren inferior',
}

function formatFecha(fechaStr) {
  if (!fechaStr) return ''
  const [anio, mes, dia] = fechaStr.split('-')
  return `${dia}/${mes}/${anio}`
}

function formatHora(horaStr) {
  if (!horaStr) return ''
  return horaStr.slice(0, 5)
}

export default function AceptarTurnoPage() {
  const [fase, setFase] = useState('cargando') // cargando | info | exito | rechazado | error
  const [turnoInfo, setTurnoInfo] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const token = new URLSearchParams(window.location.search).get('token')

  useEffect(() => {
    if (!token) {
      setFase('error')
      setMensaje('Este link no es válido.')
      return
    }

    fetch(`/api/v1/turnos/lista-espera/info?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data.detail || 'Este link ya no es válido.')
          })
        }
        return res.json()
      })
      .then((data) => {
        setTurnoInfo(data)
        setFase('info')
      })
      .catch((err) => {
        setFase('error')
        setMensaje(err.message || 'Este link ya no es válido.')
      })
  }, [token])

  function handleAceptar() {
    setOcupado(true)
    fetch(`/api/v1/turnos/lista-espera/aceptar?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data.detail || 'No se pudo reservar el turno.')
          })
        }
        return res.json()
      })
      .then((data) => {
        setMensaje(data.mensaje || 'Turno reservado con éxito.')
        setFase('exito')
      })
      .catch((err) => {
        setMensaje(err.message)
        setFase('error')
      })
      .finally(() => setOcupado(false))
  }

  function handleRechazar() {
    setOcupado(true)
    fetch(`/api/v1/turnos/lista-espera/rechazar?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data.detail || 'Error al rechazar el turno.')
          })
        }
        return res.json()
      })
      .then(() => {
        setMensaje('Rechazaste el turno.')
        setFase('rechazado')
      })
      .catch((err) => {
        setMensaje(err.message)
        setFase('error')
      })
      .finally(() => setOcupado(false))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">KinePro</h1>
        <p className="text-sm text-gray-500 mb-6">Gestión de turnos</p>

        {fase === 'cargando' && (
          <p className="text-gray-500 text-center py-8">Verificando link...</p>
        )}

        {fase === 'info' && turnoInfo && (
          <>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Cupo disponible para vos
            </h2>
            <div className="bg-blue-50 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fecha</span>
                <span className="font-medium text-gray-800">{formatFecha(turnoInfo.fecha)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Horario</span>
                <span className="font-medium text-gray-800">
                  {formatHora(turnoInfo.hora_inicio)} – {formatHora(turnoInfo.hora_fin)}
                </span>
              </div>
              {turnoInfo.area_tratamiento && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Área</span>
                  <span className="font-medium text-gray-800">
                    {AREA_LABELS[turnoInfo.area_tratamiento] || turnoInfo.area_tratamiento}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-6 text-center">
              Esta oferta vence en 4 horas. Si no respondés, se le ofrecerá al siguiente en la lista.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleAceptar}
                disabled={ocupado}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
              >
                {ocupado ? 'Procesando...' : 'Aceptar turno'}
              </button>
              <button
                onClick={handleRechazar}
                disabled={ocupado}
                className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition disabled:opacity-50"
              >
                Rechazar turno
              </button>
            </div>
          </>
        )}

        {fase === 'exito' && (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-lg font-semibold text-green-700 mb-2">Turno reservado con éxito</h2>
            <p className="text-gray-500 text-sm">{mensaje}</p>
          </div>
        )}

        {fase === 'rechazado' && (
          <div className="text-center py-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Rechazaste el turno</h2>
            <p className="text-gray-500 text-sm">
              Quedás en lista de espera para otras oportunidades.
            </p>
          </div>
        )}

        {fase === 'error' && (
          <div className="text-center py-4">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Link no válido</h2>
            <p className="text-gray-500 text-sm">{mensaje || 'Este link ya no es válido o expiró.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
