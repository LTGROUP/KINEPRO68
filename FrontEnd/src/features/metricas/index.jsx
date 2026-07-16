import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getReporteAusentismo } from '../../services/turnosService'
import { getPatientDetail } from '../../services/patientService'

const VERDE = '#0D4A3A'

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const ANIOS_AUSENTISMO = [2025, 2026, 2027]

function pad2(n) {
    return String(n).padStart(2, '0')
}

function formatFechaDDMMYYYY(fechaStr) {
    if (!fechaStr) return ''
    const [anio, mes, dia] = fechaStr.slice(0, 10).split('-')
    return `${dia}/${mes}/${anio}`
}

export function MetricasPage({ user }) {
    const [tab, setTab] = useState('cancelaciones')

    return (
        <section style={{ background: VERDE, padding: '1rem 2rem 2rem' }}>
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                width: '100%',
                minHeight: 'calc(100vh - 120px)',
            }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ color: VERDE, fontWeight: 'bold', marginBottom: '0.25rem', letterSpacing: '0.02em' }}>KINEPRO</p>
                    <h1 style={{ margin: 0, color: '#1a1a1a' }}>Métricas</h1>
                    <p style={{ margin: '0.35rem 0 0', color: '#718096', fontSize: '0.95rem' }}>
                        Seguimiento de cancelaciones y ausentismo
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button
                        type="button"
                        onClick={() => setTab('cancelaciones')}
                        style={tabButtonStyle(tab === 'cancelaciones')}
                    >
                        Cancelaciones
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('ausentismo')}
                        style={tabButtonStyle(tab === 'ausentismo')}
                    >
                        Reporte de ausentismo
                    </button>
                </div>

                {tab === 'cancelaciones' && <CancelacionesReporte user={user} />}
                {tab === 'ausentismo' && <AusentismoReporte user={user} />}
            </div>
        </section>
    )
}

function tabButtonStyle(active) {
    return {
        padding: '0.6rem 1.2rem',
        borderRadius: '8px',
        border: active ? `1px solid ${VERDE}` : '1px solid #ddd',
        background: active ? VERDE : 'white',
        color: active ? 'white' : '#333',
        fontWeight: 600,
        cursor: 'pointer',
    }
}

// ── Íconos SVG (outline, 24x24, color verde institucional) ────────
const ICON_PROPS = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: VERDE,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
}

function IconCalendario() {
    return (
        <svg {...ICON_PROPS}>
            <path d="M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
    )
}

function IconCancelado() {
    return (
        <svg {...ICON_PROPS}>
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
    )
}

function IconReservado() {
    return (
        <svg {...ICON_PROPS}>
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
        </svg>
    )
}

function IconPresente() {
    return (
        <svg {...ICON_PROPS}>
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}

function IconPorcentaje() {
    return (
        <svg {...ICON_PROPS}>
            <line x1="19" y1="5" x2="5" y2="19" />
            <circle cx="6.5" cy="6.5" r="2.5" />
            <circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
    )
}

function IconLupa() {
    return (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    )
}

// ── Skeleton loader ───────────────────────────────────────────────
function SkeletonBlock({ style }) {
    return (
        <div
            style={{
                background: '#E0E0E0',
                borderRadius: '8px',
                animation: 'kinepro-pulse 1.5s ease-in-out infinite',
                ...style,
            }}
        />
    )
}

function SkeletonMetricas() {
    return (
        <div>
            <style>{`@keyframes kinepro-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
            <SkeletonBlock style={{ width: '100%', height: '350px', marginBottom: '2rem' }} />
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonBlock key={i} style={{ flex: '1 1 160px', minWidth: '150px', height: '100px' }} />
                ))}
            </div>
        </div>
    )
}

function SkeletonAusenciaCards() {
    return (
        <div>
            <style>{`@keyframes kinepro-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonBlock key={i} style={{ width: '100%', height: '96px' }} />
                ))}
            </div>
        </div>
    )
}

function CancelacionesReporte({ user }) {
    const [datos, setDatos] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [mesSeleccionado, setMesSeleccionado] = useState('')
    const [anioSeleccionado, setAnioSeleccionado] = useState('')

    // 1 & 2. Movimos cargar() afuera del useEffect para que sea accesible en todo el componente.
    // Además, ahora acepta los filtros y los manda a la API.
    async function cargar(mes = '', anio = '') {
        setCargando(true)
        try {
            const token = user?.access_token

            // Construimos la URL con los parámetros de búsqueda si existen
            const queryParams = new URLSearchParams()
            if (mes) queryParams.append('mes', mes)
            if (anio) queryParams.append('anio', anio)

            const url = queryParams.toString()
                ? `/api/v1/turnos/metricas?${queryParams.toString()}`
                : '/api/v1/turnos/metricas'

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (!res.ok) {
                throw new Error(`Error ${res.status}`)
            }
            const json = await res.json()
            setDatos(json)
        } catch (e) {
            console.error(e)
        } finally {
            setCargando(false)
        }
    }

    // Llamada inicial
    useEffect(() => {
        cargar()
    }, [user]) // Es buena práctica incluir dependencias relevantes

    function handleFiltrar() {
        cargar(mesSeleccionado, anioSeleccionado)
    }

    // 3. Corregido el cierre de la función (eliminado el ", [user])")
    function handleLimpiar() {
        setMesSeleccionado('')
        setAnioSeleccionado('')
        cargar('', '')
    }

    if (cargando) return <SkeletonMetricas />
    if (!datos) return <p style={{ padding: '2rem' }}>No se pudieron cargar las métricas.</p>

    const ANIOS_OPTIONS = datos?.anios_disponibles || []

    // Estilos reutilizables
    const estiloFiltroBlanco = { padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: 'white' }

    return (
        <>
            {/* Barra de filtros horizontal compacta */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-end' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '6px', fontWeight: '500' }}>Mes</label>
                    <select
                        value={mesSeleccionado}
                        onChange={e => setMesSeleccionado(e.target.value)}
                        style={estiloFiltroBlanco}
                    >
                        <option value="">Todos</option>
                        {MESES.map((nombre, idx) => (
                            <option key={idx + 1} value={idx + 1}>{nombre}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '6px', fontWeight: '500' }}>Año</label>
                    <select
                        value={anioSeleccionado}
                        onChange={e => setAnioSeleccionado(e.target.value)}
                        style={estiloFiltroBlanco}
                    >
                        <option value="">Todos</option>
                        {ANIOS_OPTIONS.map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>

                <button onClick={handleFiltrar} style={{ padding: '0.5rem 1rem', background: VERDE, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    Filtrar
                </button>
                <button onClick={handleLimpiar} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    Limpiar
                </button>
            </div>

            {/* Gráfico a ancho completo */}
            <h2 style={{ marginBottom: '1.2rem', color: '#1a3c2e', fontSize: '1.4rem' }}>Evolución mensual</h2>
            {datos.grafico_por_mes?.length === 0 ? (
                <p style={{ color: '#666' }}>No hay datos para el período seleccionado.</p>
            ) : (
                <div style={{
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: '1px solid #edf2f0',
                    marginBottom: '3rem',
                    width: '100%',
                }}>
                    <div style={{ width: '100%', height: '350px' }}>
                        <ResponsiveBarChart data={datos.grafico_por_mes} />
                    </div>
                </div>
            )}

            {/* Tarjetas debajo del gráfico */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Tarjeta icono={<IconCalendario />} titulo="Total turnos" valor={datos.total_turnos} />
                <Tarjeta icono={<IconCancelado />} titulo="Cancelados" valor={datos.cancelados} />
                <Tarjeta icono={<IconReservado />} titulo="Reservados" valor={datos.reservados} />
                <Tarjeta icono={<IconPresente />} titulo="Presentes" valor={datos.presentes} />
                <Tarjeta icono={<IconPorcentaje />} titulo="Tasa de cancelación" valor={`${datos.tasa_cancelacion}%`} />
            </div>
        </>
    )
}

function ResponsiveBarChart({ data }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" stroke="#4a5568" />
                <YAxis allowDecimals={false} stroke="#4a5568" />
                <Tooltip />
                <Legend />
                <Bar dataKey="cancelados" fill="#e63946" name="Cancelados" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reservados" fill="#2d6a4f" name="Reservados" radius={[4, 4, 0, 0]} />
                <Bar dataKey="presentes" fill="#457b9d" name="Presentes" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}

function AusentismoReporte({ user }) {
    const hoy = new Date()

    const [modoFiltro, setModoFiltro] = useState('mes') // 'mes' | 'rango'

    const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth() + 1)
    const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear())

    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')

    const [reporte, setReporte] = useState(null)
    const [pacientesInfo, setPacientesInfo] = useState({}) // paciente_id -> { nombre, apellido, dni } | null
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState('')
    const [expandidas, setExpandidas] = useState({}) // paciente_id -> bool

    function toggleExpandida(pacienteId) {
        setExpandidas((prev) => ({ ...prev, [pacienteId]: !prev[pacienteId] }))
    }

    async function handleGenerar() {
        let desde = fechaDesde
        let hasta = fechaHasta

        if (modoFiltro === 'mes') {
            const ultimoDia = new Date(Number(anioSeleccionado), Number(mesSeleccionado), 0).getDate()
            desde = `${anioSeleccionado}-${pad2(mesSeleccionado)}-01`
            hasta = `${anioSeleccionado}-${pad2(mesSeleccionado)}-${pad2(ultimoDia)}`
        } else {
            if (!fechaDesde || !fechaHasta) {
                setError('Seleccioná ambas fechas para generar el reporte.')
                return
            }
            if (fechaHasta < fechaDesde) {
                setError('La fecha hasta debe ser posterior a la fecha desde.')
                return
            }
        }

        setCargando(true)
        setError('')
        setReporte(null)
        setExpandidas({})

        try {
            const data = await getReporteAusentismo(user, desde, hasta)
            setReporte(data)

            const ausencias = data?.ausencias || []
            const entradas = await Promise.all(
                ausencias.map(async (fila) => {
                    try {
                        const paciente = await getPatientDetail(user, fila.paciente_id)
                        return [fila.paciente_id, paciente]
                    } catch {
                        return [fila.paciente_id, null]
                    }
                })
            )
            setPacientesInfo(Object.fromEntries(entradas))
        } catch (err) {
            setError(err.message || 'Error al consultar el reporte de ausentismo')
        } finally {
            setCargando(false)
        }
    }

    const estiloFiltroBlanco = { padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: 'white' }

    return (
        <div>
            {/* Tabs de modo de filtro */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                    type="button"
                    onClick={() => setModoFiltro('mes')}
                    style={modoTabStyle(modoFiltro === 'mes')}
                >
                    Por mes
                </button>
                <button
                    type="button"
                    onClick={() => setModoFiltro('rango')}
                    style={modoTabStyle(modoFiltro === 'rango')}
                >
                    Rango personalizado
                </button>
            </div>

            {modoFiltro === 'mes' ? (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '6px', fontWeight: '500' }}>Mes</label>
                        <select
                            value={mesSeleccionado}
                            onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                            style={estiloFiltroBlanco}
                        >
                            {MESES.map((nombre, idx) => (
                                <option key={idx + 1} value={idx + 1}>{nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '6px', fontWeight: '500' }}>Año</label>
                        <select
                            value={anioSeleccionado}
                            onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
                            style={estiloFiltroBlanco}
                        >
                            {ANIOS_AUSENTISMO.map((a) => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={handleGenerar}
                        disabled={cargando}
                        style={{
                            padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none',
                            background: VERDE, color: 'white', fontWeight: 600,
                            cursor: cargando ? 'default' : 'pointer', opacity: cargando ? 0.7 : 1,
                        }}
                    >
                        {cargando ? 'Generando...' : 'Generar reporte'}
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', color: '#333' }}>
                        Desde
                        <input
                            type="date"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
                        />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', color: '#333' }}>
                        Hasta
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
                        />
                    </label>
                    <button
                        type="button"
                        onClick={handleGenerar}
                        disabled={cargando}
                        style={{
                            padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none',
                            background: VERDE, color: 'white', fontWeight: 600,
                            cursor: cargando ? 'default' : 'pointer', opacity: cargando ? 0.7 : 1,
                        }}
                    >
                        {cargando ? 'Generando...' : 'Generar reporte'}
                    </button>
                </div>
            )}

            {error && <p style={{ color: '#e63946', fontSize: '0.85rem', margin: '0 0 1rem' }}>{error}</p>}

            <div style={{ marginTop: '1.5rem' }}>
                {cargando && <SkeletonAusenciaCards />}

                {!cargando && reporte && reporte.ausencias.length === 0 && (
                    <EstadoVacioAusencias />
                )}

                {!cargando && reporte && reporte.ausencias.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {reporte.ausencias.map((fila) => (
                            <AusenciaCard
                                key={fila.paciente_id}
                                fila={fila}
                                paciente={pacientesInfo[fila.paciente_id]}
                                expandida={!!expandidas[fila.paciente_id]}
                                onToggleExpandir={() => toggleExpandida(fila.paciente_id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function modoTabStyle(active) {
    return {
        padding: '0.4rem 0.9rem',
        borderRadius: '6px',
        border: active ? `1px solid ${VERDE}` : '1px solid #ccc',
        background: active ? VERDE : 'white',
        color: active ? 'white' : '#555',
        fontWeight: 600,
        fontSize: '0.85rem',
        cursor: 'pointer',
    }
}

function EstadoVacioAusencias() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', color: '#a0aec0' }}>
            <IconLupa />
            <p style={{ marginTop: '0.75rem' }}>No se encontraron ausencias para el período seleccionado</p>
        </div>
    )
}

function AusenciaCard({ fila, paciente, expandida, onToggleExpandir }) {
    const nombreCompleto = paciente ? `${paciente.nombre} ${paciente.apellido}` : `${fila.paciente_id.slice(0, 8)}...`
    const dni = paciente?.dni

    const fechasOrdenadas = fila.fechas
    const mostrarTodas = expandida || fechasOrdenadas.length <= 3
    const fechasAMostrar = mostrarTodas ? fechasOrdenadas : fechasOrdenadas.slice(0, 3)
    const restantes = fechasOrdenadas.length - 3

    return (
        <div style={{
            background: 'white',
            borderLeft: `4px solid ${VERDE}`,
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 700, color: '#1a3c2e' }}>
                    👤 {nombreCompleto}
                </span>
                {dni && (
                    <span style={{ color: '#718096', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>DNI: {dni}</span>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: '22px', height: '22px', borderRadius: '999px',
                    background: '#FFEBEE', color: '#B71C1C', fontWeight: 700, fontSize: '0.8rem', padding: '0 6px',
                }}>
                    {fila.total_ausencias}
                </span>
                <span style={{ color: '#555', fontSize: '0.9rem' }}>
                    {fila.total_ausencias === 1 ? 'ausencia' : 'ausencias'}
                </span>
            </div>

            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#444', fontSize: '0.9rem' }}>
                {fechasAMostrar.map((f) => (
                    <li key={f}>{formatFechaDDMMYYYY(f)}</li>
                ))}
            </ul>

            {!expandida && restantes > 0 && (
                <button
                    type="button"
                    onClick={onToggleExpandir}
                    style={{
                        marginTop: '0.4rem', border: 'none', background: 'transparent',
                        color: VERDE, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', padding: 0,
                    }}
                >
                    ... y {restantes} más
                </button>
            )}

            {expandida && fechasOrdenadas.length > 3 && (
                <button
                    type="button"
                    onClick={onToggleExpandir}
                    style={{
                        marginTop: '0.4rem', border: 'none', background: 'transparent',
                        color: VERDE, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', padding: 0,
                    }}
                >
                    Ver menos
                </button>
            )}
        </div>
    )
}

function Tarjeta({ icono, titulo, valor }) {
    return (
        <div style={{
            background: '#f8f9fa',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #edf2f0',
            minWidth: '150px',
            textAlign: 'center',
            flex: '1 1 160px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.01)'
        }}>
            {icono && <div style={{ marginBottom: '0.4rem', display: 'flex', justifyContent: 'center' }}>{icono}</div>}
            <p style={{ color: '#718096', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500' }}>{titulo}</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: VERDE }}>{valor ?? 0}</p>
        </div>
    )
}
