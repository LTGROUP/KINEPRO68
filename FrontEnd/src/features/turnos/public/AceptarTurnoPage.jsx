import { useState, useEffect, useMemo } from 'react'

const AREA_LABELS = {
  tren_superior: 'Tren superior',
  tren_medio: 'Tren medio',
  tren_inferior: 'Tren inferior',
}

const TIMEOUT_LENTO_MS = 8000

function formatFecha(fechaStr) {
  if (!fechaStr) return ''
  const [anio, mes, dia] = fechaStr.split('-')
  return `${dia}/${mes}/${anio}`
}

function formatHora(horaStr) {
  if (!horaStr) return ''
  return horaStr.slice(0, 5)
}

function SkeletonCard() {
  return (
    <div aria-live="polite" aria-busy="true">
      <div className="animate-pulse h-5 w-2/3 bg-gray-200 rounded mb-4" />
      <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6 space-y-3">
        <div className="animate-pulse h-4 w-full bg-gray-200 rounded" />
        <div className="animate-pulse h-4 w-full bg-gray-200 rounded" />
        <div className="animate-pulse h-4 w-3/4 bg-gray-200 rounded" />
      </div>
      <div className="animate-pulse h-12 w-full bg-gray-200 rounded-lg mb-3" />
      <div className="animate-pulse h-12 w-full bg-gray-100 rounded-lg" />
    </div>
  )
}

export default function AceptarTurnoPage() {
  // El token se extrae de forma síncrona durante el render inicial (no dentro
  // del useEffect) para no perder un ciclo de render antes de empezar a cargar.
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get('token'),
    []
  )

  const [fase, setFase] = useState(token ? 'cargando' : 'error')
  const [turnoInfo, setTurnoInfo] = useState(null)
  const [mensaje, setMensaje] = useState(token ? '' : 'Este link no es válido.')
  const [ocupado, setOcupado] = useState(false)
  const [cargaLenta, setCargaLenta] = useState(false)

  useEffect(() => {
    if (!token) {
      setFase('error')
      setMensaje('Este link no es válido.')
      return
    }

    let cancelado = false
    setCargaLenta(false)

    const timeoutLento = setTimeout(() => {
      if (!cancelado) setCargaLenta(true)
    }, TIMEOUT_LENTO_MS)

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
        if (cancelado) return
        setTurnoInfo(data)
        setFase('info')
      })
      .catch((err) => {
        if (cancelado) return
        setFase('error')
        setMensaje(err.message || 'Este link ya no es válido.')
      })
      .finally(() => {
        if (!cancelado) setCargaLenta(false)
      })

    return () => {
      cancelado = true
      clearTimeout(timeoutLento)
    }
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
      .then((data) => {
        setMensaje(data.mensaje || 'Rechazaste el turno.')
        setFase('rechazado')
      })
      .catch((err) => {
        setMensaje(err.message)
        setFase('error')
      })
      .finally(() => setOcupado(false))
  }

  return (
    <div className="min-h-screen bg-[#0D4A3A] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        <img src="/KinePro.jpg" alt="KinePro" className="w-20 h-auto mb-2" />
        <p className="text-sm text-gray-500 mb-6">Gestión de turnos</p>

        {fase === 'cargando' && (
          <>
            <SkeletonCard />
            <p className="text-gray-400 text-xs text-center mt-4">
              {cargaLenta ? 'Verificando tu link...' : 'Cargando la información de tu turno...'}
            </p>
          </>
        )}

        {fase === 'info' && turnoInfo && (
          <>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Cupo disponible para vos
            </h2>
            <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6 space-y-2">
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
                className="w-full bg-[#0D4A3A] hover:opacity-90 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
              >
                {ocupado ? 'Procesando...' : 'Aceptar turno'}
              </button>
              <button
                onClick={handleRechazar}
                disabled={ocupado}
                className="w-full bg-white border border-[#0D4A3A] hover:bg-gray-50 text-[#0D4A3A] font-semibold py-3 rounded-lg transition disabled:opacity-50"
              >
                Rechazar turno
              </button>
            </div>
          </>
        )}

        {fase === 'exito' && (
          <div className="text-center py-4">
            <div className="text-4xl mb-4 text-[#0D4A3A]">✓</div>
            <h2 className="text-lg font-semibold text-[#0D4A3A] mb-2">Turno reservado con éxito</h2>
            <p className="text-gray-500 text-sm">{mensaje}</p>
          </div>
        )}

        {fase === 'rechazado' && (
          <div className="text-center py-4">
            <h2 className="text-lg font-semibold text-gray-600 mb-2">Rechazaste el turno</h2>
            <p className="text-gray-500 text-sm">{mensaje}</p>
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
