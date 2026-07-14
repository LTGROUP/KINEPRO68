import { useEffect, useMemo, useState } from 'react'
import { Plus, X, Minus, Clock } from 'lucide-react'

import { generarGrilla, getDiasCerrados, crearDiaCerrado, eliminarDiaCerrado, editarHorarioDia } from '../../../services/turnosService'

const VERDE = '#0D4A3A'

const DIAS_OPTIONS = [
  { value: 'lunes', label: 'Lu' },
  { value: 'martes', label: 'Ma' },
  { value: 'miercoles', label: 'Mi' },
  { value: 'jueves', label: 'Ju' },
  { value: 'viernes', label: 'Vi' },
  { value: 'sabado', label: 'Sa' },
  { value: 'domingo', label: 'Do' },
]

// Índice = Date.getDay() (0 = domingo ... 6 = sábado), usado para saber si un día del calendario es hábil
const DIA_JS_A_NOMBRE = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIA_SEMANA_HEADERS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

// Índice = Date.getDay() (0 = domingo ... 6 = sábado), para el selector deslizable de fechas
const DIA_SEMANA_CORTO = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

const DIAS_HABILES_DEFAULT = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
const FRANJAS_DEFAULT = [{ hora_inicio: '08:00', hora_fin: '12:00' }]
const CUPOS_DEFAULT = 2

function getDefaultAnio() {
  return new Date().getFullYear()
}

function getDefaultMes() {
  return new Date().getMonth() + 1
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toFechaStr(anio, mes, dia) {
  return `${anio}-${pad2(mes)}-${pad2(dia)}`
}

function horaAMinutos(hora) {
  if (!hora) return 0
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

// Cantidad de slots de 60 min que entran en una franja (sin multiplicar por cupos)
function slotsDeFranja(franja) {
  const minutos = horaAMinutos(franja.hora_fin) - horaAMinutos(franja.hora_inicio)
  if (minutos <= 0) return 0
  return minutos / 60
}

function franjaEsValida(franja) {
  return horaAMinutos(franja.hora_fin) > horaAMinutos(franja.hora_inicio)
}

function ConfigurarGrillaView({ user, onSuccess }) {
  const [mes, setMes] = useState(getDefaultMes())
  const [anio, setAnio] = useState(getDefaultAnio())
  const [turnos_por_slot, setTurnosPorSlot] = useState(1)
  const [diasHabiles, setDiasHabiles] = useState(DIAS_HABILES_DEFAULT)
  const [franjas, setFranjas] = useState(FRANJAS_DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)

  // Cada item: { fecha: 'YYYY-MM-DD', motivo, horario_inicio, horario_fin }
  // Sin horario_inicio/horario_fin => día cerrado completo. Con ambos => excepción de horario reducido.
  const [diasCerrados, setDiasCerrados] = useState([])
  const [cargandoCalendario, setCargandoCalendario] = useState(false)
  const [errorCalendario, setErrorCalendario] = useState('')

  const [preview, setPreview] = useState(null)

  // Formulario de excepción de horario
  const [mostrarFormExcepcion, setMostrarFormExcepcion] = useState(false)
  const [excFecha, setExcFecha] = useState('')
  const [excHoraInicio, setExcHoraInicio] = useState('08:00')
  const [excHoraFin, setExcHoraFin] = useState('12:00')
  const [excMotivo, setExcMotivo] = useState('')
  const [excGuardando, setExcGuardando] = useState(false)
  const [excError, setExcError] = useState('')

  // Editar horario de un día ya generado
  const [editarFecha, setEditarFecha] = useState('')
  const [editarHoraInicio, setEditarHoraInicio] = useState('08:00')
  const [editarHoraFin, setEditarHoraFin] = useState('12:00')
  const [editarGuardando, setEditarGuardando] = useState(false)
  const [editarError, setEditarError] = useState('')
  const [editarResultado, setEditarResultado] = useState(null)

  const diasCerradosCompletos = useMemo(
    () => diasCerrados.filter((d) => !(d.horario_inicio && d.horario_fin)),
    [diasCerrados]
  )
  const excepciones = useMemo(
    () => diasCerrados.filter((d) => d.horario_inicio && d.horario_fin),
    [diasCerrados]
  )

  const diasCerradosCompletosSet = useMemo(
    () => new Set(diasCerradosCompletos.map((d) => d.fecha)),
    [diasCerradosCompletos]
  )
  const excepcionesMap = useMemo(
    () => new Map(excepciones.map((d) => [d.fecha, d])),
    [excepciones]
  )

  useEffect(() => {
    let cancelado = false

    async function cargarDiasCerrados() {
      setCargandoCalendario(true)
      setErrorCalendario('')
      try {
        const data = await getDiasCerrados(user, mes, anio)
        if (!cancelado) setDiasCerrados(data.dias_cerrados || [])
      } catch (err) {
        if (!cancelado) setErrorCalendario(err.message || 'No se pudieron cargar los días cerrados')
      } finally {
        if (!cancelado) setCargandoCalendario(false)
      }
    }

    cargarDiasCerrados()
    return () => { cancelado = true }
  }, [user, mes, anio])

  function toggleDia(dia) {
    setDiasHabiles((prev) => {
      if (prev.includes(dia)) {
        return prev.filter((d) => d !== dia)
      }
      return [...prev, dia]
    })
  }

  function handleFranjaChange(index, field, value) {
    setFranjas((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addFranja() {
    setFranjas((prev) => [...prev, { hora_inicio: '14:00', hora_fin: '18:00' }])
  }

  function removeFranja(index) {
    setFranjas((prev) => prev.filter((_, i) => i !== index))
  }

  function incrementarCupos() {
    setTurnosPorSlot((prev) => Math.min(10, Number(prev) + 1))
  }

  function decrementarCupos() {
    setTurnosPorSlot((prev) => Math.max(1, Number(prev) - 1))
  }

  const franjasValidas = franjas.length > 0 && franjas.every(franjaEsValida)

  // Slots por día (sin cupos) sumando todas las franjas
  const slotsPorDia = franjas.reduce((acc, f) => acc + (franjaEsValida(f) ? slotsDeFranja(f) : 0), 0)
  // "X turnos por día" en tiempo real: suma de (hora_fin - hora_inicio)/60 por franja, multiplicado por cupos
  const turnosPorDiaTiempoReal = slotsPorDia * Number(turnos_por_slot || 0)

  // Días hábiles del mes seleccionado que todavía no están cerrados/con excepción (para el select del formulario)
  const fechasDisponiblesParaExcepcion = useMemo(() => {
    const totalDiasMes = new Date(Number(anio), Number(mes), 0).getDate()
    const fechas = []
    for (let dia = 1; dia <= totalDiasMes; dia++) {
      const fechaStr = toFechaStr(anio, mes, dia)
      const nombreDia = DIA_JS_A_NOMBRE[new Date(Number(anio), Number(mes) - 1, dia).getDay()]
      const esHabil = diasHabiles.includes(nombreDia)
      const yaOcupado = diasCerradosCompletosSet.has(fechaStr) || excepcionesMap.has(fechaStr)
      if (esHabil && !yaOcupado) {
        fechas.push(fechaStr)
      }
    }
    return fechas
  }, [mes, anio, diasHabiles, diasCerradosCompletosSet, excepcionesMap])

  // Todos los días del mes (para editar el horario de un día ya generado, sin filtrar por hábiles/ocupados)
  const fechasTodasDelMes = useMemo(() => {
    const totalDiasMes = new Date(Number(anio), Number(mes), 0).getDate()
    const fechas = []
    for (let dia = 1; dia <= totalDiasMes; dia++) {
      fechas.push(toFechaStr(anio, mes, dia))
    }
    return fechas
  }, [mes, anio])

  async function handleToggleDiaCalendario(fechaStr, esCerrado) {
    setErrorCalendario('')
    try {
      if (esCerrado) {
        await eliminarDiaCerrado(user, fechaStr)
        setDiasCerrados((prev) => prev.filter((d) => d.fecha !== fechaStr))
      } else {
        await crearDiaCerrado(user, fechaStr, 'Cerrado por secretaría')
        setDiasCerrados((prev) => [...prev, { fecha: fechaStr, motivo: 'Cerrado por secretaría' }])
      }
    } catch (err) {
      setErrorCalendario(err.message || 'No se pudo actualizar el día cerrado')
    }
  }

  function abrirFormExcepcion() {
    setExcError('')
    setExcFecha(fechasDisponiblesParaExcepcion[0] || '')
    setExcHoraInicio('08:00')
    setExcHoraFin('12:00')
    setExcMotivo('')
    setMostrarFormExcepcion(true)
  }

  function cancelarFormExcepcion() {
    setMostrarFormExcepcion(false)
    setExcError('')
  }

  async function handleGuardarExcepcion() {
    setExcError('')

    if (!excFecha) {
      setExcError('Elegí una fecha para la excepción.')
      return
    }

    if (horaAMinutos(excHoraFin) <= horaAMinutos(excHoraInicio)) {
      setExcError('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }

    setExcGuardando(true)
    try {
      await crearDiaCerrado(user, excFecha, excMotivo || null, excHoraInicio, excHoraFin)
      setDiasCerrados((prev) => [
        ...prev,
        { fecha: excFecha, motivo: excMotivo || null, horario_inicio: excHoraInicio, horario_fin: excHoraFin },
      ])
      setMostrarFormExcepcion(false)
    } catch (err) {
      setExcError(err.message || 'No se pudo guardar la excepción de horario')
    } finally {
      setExcGuardando(false)
    }
  }

  async function handleEliminarExcepcion(fechaStr) {
    setErrorCalendario('')
    try {
      await eliminarDiaCerrado(user, fechaStr)
      setDiasCerrados((prev) => prev.filter((d) => d.fecha !== fechaStr))
    } catch (err) {
      setErrorCalendario(err.message || 'No se pudo eliminar la excepción')
    }
  }

  async function handleAplicarEditarHorario() {
    setEditarError('')
    setEditarResultado(null)

    if (!editarFecha) {
      setEditarError('Elegí un día para editar.')
      return
    }

    if (horaAMinutos(editarHoraFin) <= horaAMinutos(editarHoraInicio)) {
      setEditarError('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }

    setEditarGuardando(true)
    try {
      const data = await editarHorarioDia(user, editarFecha, editarHoraInicio, editarHoraFin)
      setEditarResultado(data)

      // Si el día editado tenía una excepción de horario reducido registrada, refrescamos el calendario del mes.
      const data2 = await getDiasCerrados(user, mes, anio)
      setDiasCerrados(data2.dias_cerrados || [])
    } catch (err) {
      setEditarError(err.message || 'No se pudo actualizar el horario del día')
    } finally {
      setEditarGuardando(false)
    }
  }

  function handleVerPreview() {
    setError('')
    setPreview(null)

    if (diasHabiles.length === 0) {
      setError('Seleccioná al menos un día hábil.')
      return
    }

    if (franjas.length === 0) {
      setError('Agregá al menos una franja horaria.')
      return
    }

    if (!franjasValidas) {
      setError('La hora de fin debe ser posterior a la hora de inicio en todas las franjas.')
      return
    }

    const totalDiasDelMes = new Date(Number(anio), Number(mes), 0).getDate()
    let diasHabilesCount = 0
    const cerradosDelMes = []

    for (let dia = 1; dia <= totalDiasDelMes; dia++) {
      const fechaStr = toFechaStr(anio, mes, dia)
      const nombreDia = DIA_JS_A_NOMBRE[new Date(Number(anio), Number(mes) - 1, dia).getDay()]
      const esHabil = diasHabiles.includes(nombreDia)
      const esCerrado = diasCerradosCompletosSet.has(fechaStr)

      if (esCerrado) {
        const info = diasCerradosCompletos.find((d) => d.fecha === fechaStr)
        cerradosDelMes.push(info || { fecha: fechaStr, motivo: '' })
      }

      if (esHabil && !esCerrado) {
        diasHabilesCount += 1
      }
    }

    const totalTurnos = diasHabilesCount * turnosPorDiaTiempoReal

    setPreview({
      mes: Number(mes),
      anio: Number(anio),
      diasHabilesCount,
      turnosPorDia: turnosPorDiaTiempoReal,
      totalTurnos,
      cerradosDelMes,
    })
  }

  async function handleGenerarGrilla() {
    setError('')
    setResultado(null)

    if (diasHabiles.length === 0) {
      setError('Seleccioná al menos un día hábil.')
      return
    }

    if (franjas.length === 0 || !franjasValidas) {
      setError('Revisá las franjas horarias: la hora de fin debe ser posterior a la de inicio.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        mes: Number(mes),
        anio: Number(anio),
        turnos_por_slot: Number(turnos_por_slot),
        dias_habiles: diasHabiles,
        franjas: franjas.map((f) => ({
          hora_inicio: f.hora_inicio,
          hora_fin: f.hora_fin,
        })),
        dias_cerrados: [],
      }

      const data = await generarGrilla(user, payload)
      setResultado(data)

      if (onSuccess) {
        onSuccess(data.mensaje || 'Grilla generada correctamente.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleLimpiar() {
    const hoy = new Date()
    let mesSiguiente = hoy.getMonth() + 2 // getMonth() es 0-based; +1 para el mes actual 1-based, +1 para el siguiente
    if (mesSiguiente > 12) {
      mesSiguiente = 1
    }

    setMes(mesSiguiente)
    setAnio(hoy.getFullYear())
    setTurnosPorSlot(CUPOS_DEFAULT)
    setDiasHabiles(DIAS_HABILES_DEFAULT)
    setFranjas(FRANJAS_DEFAULT)
    // Solo limpia la lista local; no elimina nada en el backend.
    setDiasCerrados((prev) => prev.filter((d) => !(d.horario_inicio && d.horario_fin)))
    setMostrarFormExcepcion(false)
    setPreview(null)
    setResultado(null)
    setError('')
    // El cambio de mes/año dispara el useEffect que recarga los días cerrados desde el backend.
  }

  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {/* COLUMNA IZQUIERDA: configuración */}
      <div style={{ flex: '1 1 380px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* SECCIÓN 1: configuración básica */}
        <div style={panelStyle}>
          <h2 style={panelTitleStyle}>Configuración básica</h2>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 140px' }}>
              <label style={labelStyle} htmlFor="grilla-mes">Mes</label>
              <select
                id="grilla-mes"
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                style={inputStyle}
              >
                {MESES.map((label, idx) => (
                  <option key={idx + 1} value={idx + 1}>{label}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 100px' }}>
              <label style={labelStyle} htmlFor="grilla-anio">Año</label>
              <input
                id="grilla-anio"
                type="number"
                value={anio}
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 2}
                onChange={(e) => setAnio(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.2rem' }}>
            <label style={labelStyle}>Cupos por turno</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                type="button"
                onClick={decrementarCupos}
                disabled={turnos_por_slot <= 1}
                style={stepperButtonStyle}
                aria-label="Disminuir cupos por turno"
              >
                <Minus size={16} aria-hidden="true" />
              </button>
              <span style={{ fontSize: '2rem', fontWeight: 'bold', color: VERDE, minWidth: '2.5ch', textAlign: 'center' }}>
                {turnos_por_slot}
              </span>
              <button
                type="button"
                onClick={incrementarCupos}
                disabled={turnos_por_slot >= 10}
                style={stepperButtonStyle}
                aria-label="Aumentar cupos por turno"
              >
                <Plus size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Días hábiles</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {DIAS_OPTIONS.map((dia) => {
                const activo = diasHabiles.includes(dia.value)
                return (
                  <button
                    key={dia.value}
                    type="button"
                    onClick={() => toggleDia(dia.value)}
                    aria-pressed={activo}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      border: activo ? `1px solid ${VERDE}` : '1px solid #ccc',
                      background: activo ? VERDE : 'white',
                      color: activo ? 'white' : '#666',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {dia.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: franjas horarias */}
        <div style={panelStyle}>
          <h2 style={panelTitleStyle}>Franjas horarias</h2>

          {franjas.map((franja, index) => {
            const valida = franjaEsValida(franja)
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <input
                  type="time"
                  value={franja.hora_inicio}
                  onChange={(e) => handleFranjaChange(index, 'hora_inicio', e.target.value)}
                  style={{ ...inputStyle, borderColor: valida ? '#ccc' : '#e63946' }}
                />
                <span style={{ color: '#999' }}>→</span>
                <input
                  type="time"
                  value={franja.hora_fin}
                  onChange={(e) => handleFranjaChange(index, 'hora_fin', e.target.value)}
                  style={{ ...inputStyle, borderColor: valida ? '#ccc' : '#e63946' }}
                />
                {franjas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFranja(index)}
                    aria-label={`Eliminar franja ${index + 1}`}
                    style={{ border: 'none', background: 'transparent', color: '#e63946', cursor: 'pointer', padding: '0.3rem' }}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
            )
          })}

          {!franjasValidas && (
            <p style={{ color: '#e63946', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
              La hora de fin debe ser posterior a la hora de inicio en cada franja.
            </p>
          )}

          <button
            type="button"
            onClick={addFranja}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              border: `1px dashed ${VERDE}`, background: 'transparent', color: VERDE,
              borderRadius: '6px', padding: '0.5rem 0.9rem', cursor: 'pointer', fontWeight: 600,
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Agregar franja
          </button>

          <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', background: '#f4f7f5', borderRadius: '8px', fontWeight: 600, color: VERDE }}>
            {Math.round(turnosPorDiaTiempoReal * 100) / 100} turnos por día
          </div>
        </div>

        {/* SECCIÓN 4: preview y confirmación */}
        <div style={panelStyle}>
          <h2 style={panelTitleStyle}>Preview y confirmación</h2>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleVerPreview}
              style={{
                flex: '1 1 120px', padding: '0.7rem', borderRadius: '8px', border: `1px solid ${VERDE}`,
                background: 'white', color: VERDE, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Ver preview
            </button>
            <button
              type="button"
              onClick={handleGenerarGrilla}
              disabled={saving}
              style={{
                flex: '1 1 120px', padding: '0.7rem', borderRadius: '8px', border: 'none',
                background: VERDE, color: 'white', fontWeight: 600,
                cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Generando...' : 'Generar grilla'}
            </button>
            <button
              type="button"
              onClick={handleLimpiar}
              style={{
                flex: '1 1 120px', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc',
                background: 'white', color: '#555', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Limpiar
            </button>
          </div>

          {error && <p style={{ color: '#e63946' }}>{error}</p>}

          {preview && (
            <div style={{ background: '#f4f7f5', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.4rem', fontWeight: 600, color: VERDE }}>
                {MESES[preview.mes - 1]} {preview.anio}
              </p>
              <p style={{ margin: '0.2rem 0' }}>Días hábiles: <strong>{preview.diasHabilesCount}</strong></p>
              <p style={{ margin: '0.2rem 0' }}>Turnos por día: <strong>{Math.round(preview.turnosPorDia * 100) / 100}</strong></p>
              <p style={{ margin: '0.2rem 0' }}>Total de turnos a crear: <strong>{Math.round(preview.totalTurnos)}</strong></p>
              <p style={{ margin: '0.6rem 0 0.2rem' }}>Días cerrados del mes:</p>
              {preview.cerradosDelMes.length === 0 ? (
                <p style={{ margin: 0, color: '#666' }}>Ninguno</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                  {preview.cerradosDelMes.map((d) => (
                    <li key={d.fecha}>{d.fecha}{d.motivo ? ` — ${d.motivo}` : ''}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {resultado && (
            <div style={{ background: '#e8f5e9', borderRadius: '8px', padding: '1rem', color: VERDE }}>
              <strong>{resultado.mensaje}</strong>
              <br />
              {resultado.total_turnos_creados} turnos creados para {MESES[resultado.mes - 1]} {resultado.anio}.
              {resultado.dias_omitidos?.length > 0 && (
                <span> Días omitidos: {resultado.dias_omitidos.join(', ')}.</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* COLUMNA DERECHA: calendario + excepciones */}
      <div style={{ flex: '1 1 380px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* SECCIÓN 3: calendario del mes */}
        <div style={panelStyle}>
          <h2 style={panelTitleStyle}>Calendario de {MESES[Number(mes) - 1]} {anio}</h2>
          {errorCalendario && <p style={{ color: '#e63946', fontSize: '0.85rem' }}>{errorCalendario}</p>}
          {cargandoCalendario ? (
            <p style={{ color: '#666' }}>Cargando calendario...</p>
          ) : (
            <CalendarioMes
              mes={Number(mes)}
              anio={Number(anio)}
              diasHabiles={diasHabiles}
              diasCerradosCompletosSet={diasCerradosCompletosSet}
              excepcionesMap={excepcionesMap}
              onToggleDia={handleToggleDiaCalendario}
            />
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.8rem', color: '#666', flexWrap: 'wrap' }}>
            <LeyendaItem color="#E8F5E9" label="Hábil" />
            <LeyendaItem color="#FFEBEE" label="Cerrado" />
            <LeyendaItem color="#FFF9C4" label="Horario reducido" />
            <LeyendaItem color="#f1f1f1" label="No hábil" />
          </div>
        </div>

        {/* SECCIÓN Excepciones de horario */}
        <div style={panelStyle}>
          <h2 style={panelTitleStyle}>Excepciones de horario</h2>

          {!mostrarFormExcepcion && (
            <button
              type="button"
              onClick={abrirFormExcepcion}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                border: `1px dashed ${VERDE}`, background: 'transparent', color: VERDE,
                borderRadius: '6px', padding: '0.5rem 0.9rem', cursor: 'pointer', fontWeight: 600,
                marginBottom: '1rem',
              }}
            >
              <Plus size={16} aria-hidden="true" />
              Agregar excepción de horario
            </button>
          )}

          {mostrarFormExcepcion && (
            <div style={{ background: '#f4f7f5', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>Fecha</label>
                {fechasDisponiblesParaExcepcion.length === 0 ? (
                  <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>No hay días hábiles disponibles.</p>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'thin' }}>
                    {fechasDisponiblesParaExcepcion.map((fecha) => {
                      const [anioF, mesF, diaF] = fecha.split('-').map(Number)
                      const diaSemana = DIA_SEMANA_CORTO[new Date(anioF, mesF - 1, diaF).getDay()]
                      const seleccionado = excFecha === fecha
                      return (
                        <div
                          key={fecha}
                          onClick={() => setExcFecha(fecha)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExcFecha(fecha) }}
                          style={{
                            flex: '0 0 auto',
                            width: '48px',
                            height: '56px',
                            borderRadius: '8px',
                            border: `1px solid ${VERDE}`,
                            background: seleccionado ? VERDE : 'white',
                            color: seleccionado ? 'white' : VERDE,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{diaSemana}</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{diaF}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle} htmlFor="exc-hora-inicio">Hora inicio</label>
                  <input
                    id="exc-hora-inicio"
                    type="time"
                    value={excHoraInicio}
                    onChange={(e) => setExcHoraInicio(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle} htmlFor="exc-hora-fin">Hora fin</label>
                  <input
                    id="exc-hora-fin"
                    type="time"
                    value={excHoraFin}
                    onChange={(e) => setExcHoraFin(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle} htmlFor="exc-motivo">Motivo (opcional)</label>
                <input
                  id="exc-motivo"
                  type="text"
                  value={excMotivo}
                  onChange={(e) => setExcMotivo(e.target.value)}
                  placeholder="Ej: Jornada reducida"
                  style={inputStyle}
                />
              </div>

              {excError && <p style={{ color: '#e63946', fontSize: '0.85rem' }}>{excError}</p>}

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={handleGuardarExcepcion}
                  disabled={excGuardando || !excFecha}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none',
                    background: VERDE, color: 'white', fontWeight: 600,
                    cursor: excGuardando ? 'default' : 'pointer', opacity: excGuardando ? 0.7 : 1,
                  }}
                >
                  {excGuardando ? 'Guardando...' : 'Guardar excepción'}
                </button>
                <button
                  type="button"
                  onClick={cancelarFormExcepcion}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #ccc',
                    background: 'white', color: '#555', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {excepciones.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>No hay excepciones de horario cargadas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {excepciones.map((exc) => (
                <div
                  key={exc.fecha}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#FFF9C4', color: '#F57F17', borderRadius: '8px', padding: '0.6rem 0.9rem',
                  }}
                >
                  <span>
                    <strong>{exc.fecha}</strong> · {exc.horario_inicio?.slice(0, 5)} - {exc.horario_fin?.slice(0, 5)}
                    {exc.motivo ? ` · ${exc.motivo}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleEliminarExcepcion(exc.fecha)}
                    aria-label={`Eliminar excepción del ${exc.fecha}`}
                    style={{ border: 'none', background: 'transparent', color: '#F57F17', cursor: 'pointer' }}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECCIÓN Editar día generado */}
        <div style={panelStyle}>
          <h2 style={panelTitleStyle}>Editar día generado</h2>
          <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 1rem' }}>
            Modificá el horario de los turnos disponibles de un día que ya fue generado, sin regenerar toda la grilla. Los turnos ya reservados no se eliminan.
          </p>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Día</label>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'thin' }}>
              {fechasTodasDelMes.map((fecha) => {
                const [anioF, mesF, diaF] = fecha.split('-').map(Number)
                const diaSemana = DIA_SEMANA_CORTO[new Date(anioF, mesF - 1, diaF).getDay()]
                const seleccionado = editarFecha === fecha
                return (
                  <div
                    key={fecha}
                    onClick={() => setEditarFecha(fecha)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEditarFecha(fecha) }}
                    style={{
                      flex: '0 0 auto',
                      width: '48px',
                      height: '56px',
                      borderRadius: '8px',
                      border: `1px solid ${VERDE}`,
                      background: seleccionado ? VERDE : 'white',
                      color: seleccionado ? 'white' : VERDE,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{diaSemana}</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{diaF}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle} htmlFor="editar-hora-inicio">Hora inicio</label>
              <input
                id="editar-hora-inicio"
                type="time"
                value={editarHoraInicio}
                onChange={(e) => setEditarHoraInicio(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle} htmlFor="editar-hora-fin">Hora fin</label>
              <input
                id="editar-hora-fin"
                type="time"
                value={editarHoraFin}
                onChange={(e) => setEditarHoraFin(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {editarError && <p style={{ color: '#e63946', fontSize: '0.85rem' }}>{editarError}</p>}

          <button
            type="button"
            onClick={handleAplicarEditarHorario}
            disabled={editarGuardando || !editarFecha}
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none',
              background: VERDE, color: 'white', fontWeight: 600,
              cursor: editarGuardando ? 'default' : 'pointer', opacity: editarGuardando ? 0.7 : 1,
            }}
          >
            {editarGuardando ? 'Aplicando...' : 'Aplicar cambio'}
          </button>

          {editarResultado && (
            <div style={{ background: '#e8f5e9', borderRadius: '8px', padding: '1rem', color: VERDE, marginTop: '1rem' }}>
              Se crearon {editarResultado.turnos_creados} turnos nuevos. Se conservaron {editarResultado.turnos_reservados_conservados} turnos reservados.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LeyendaItem({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: color, display: 'inline-block', border: '1px solid #ddd' }} />
      {label}
    </span>
  )
}

function CalendarioMes({ mes, anio, diasHabiles, diasCerradosCompletosSet, excepcionesMap, onToggleDia }) {
  const primerDiaSemana = new Date(anio, mes - 1, 1).getDay() // 0=domingo..6=sabado
  // Offset para que la grilla empiece en lunes
  const offsetLunes = (primerDiaSemana + 6) % 7
  const totalDiasMes = new Date(anio, mes, 0).getDate()

  const celdas = []
  for (let i = 0; i < offsetLunes; i++) {
    celdas.push(null)
  }
  for (let dia = 1; dia <= totalDiasMes; dia++) {
    celdas.push(dia)
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
        {DIA_SEMANA_HEADERS.map((h) => (
          <div key={h} style={{ textAlign: 'center', fontSize: '0.75rem', color: '#888', fontWeight: 600 }}>
            {h}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {celdas.map((dia, idx) => {
          if (dia === null) {
            return <div key={`vacio-${idx}`} />
          }

          const fechaStr = toFechaStr(anio, mes, dia)
          const nombreDia = DIA_JS_A_NOMBRE[new Date(anio, mes - 1, dia).getDay()]
          const esHabil = diasHabiles.includes(nombreDia)
          const esCerrado = diasCerradosCompletosSet.has(fechaStr)
          const esHorarioReducido = excepcionesMap.has(fechaStr)

          let background = '#f1f1f1'
          let color = '#aaa'
          let cursor = 'default'
          let clickeable = false

          if (esHabil && esCerrado) {
            background = '#FFEBEE'
            color = '#c62828'
            cursor = 'pointer'
            clickeable = true
          } else if (esHabil && esHorarioReducido) {
            background = '#FFF9C4'
            color = '#F57F17'
            // Los días con horario reducido se gestionan desde la lista de excepciones, no clickeando el calendario.
          } else if (esHabil) {
            background = '#E8F5E9'
            color = VERDE
            cursor = 'pointer'
            clickeable = true
          }

          return (
            <button
              key={fechaStr}
              type="button"
              disabled={!clickeable}
              onClick={() => onToggleDia(fechaStr, esCerrado)}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: '6px',
                border: 'none',
                background,
                color,
                fontWeight: 600,
                cursor,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {esHabil && esCerrado && '✕'}
              {esHabil && esHorarioReducido && <Clock size={14} aria-hidden="true" />}
              {!(esHabil && (esCerrado || esHorarioReducido)) && dia}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const panelStyle = {
  background: 'white',
  borderRadius: '12px',
  padding: '1.5rem',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
}

const panelTitleStyle = {
  margin: '0 0 1rem',
  color: VERDE,
  fontSize: '1.1rem',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  color: '#555',
  marginBottom: '6px',
  fontWeight: 500,
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem',
  borderRadius: '6px',
  border: '1px solid #ccc',
  backgroundColor: 'white',
  boxSizing: 'border-box',
}

const stepperButtonStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  border: `1px solid ${VERDE}`,
  background: 'white',
  color: VERDE,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export default ConfigurarGrillaView
