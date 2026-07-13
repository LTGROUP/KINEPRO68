import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { getReporteAusentismo } from '../../services/turnosService'

export function MetricasPage({ user }) {
    const [tab, setTab] = useState('cancelaciones')

    return (
        <section style={{ padding: '2rem' }}>
            <p style={{ color: '#2d6a4f', fontWeight: 'bold', marginBottom: '0.5rem' }}>KINEPRO</p>
            <h1 style={{ marginBottom: '1rem' }}>Métricas</h1>

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
        </section>
    )
}

function tabButtonStyle(active) {
    return {
        padding: '0.6rem 1.2rem',
        borderRadius: '8px',
        border: active ? '1px solid #2d6a4f' : '1px solid #ddd',
        background: active ? '#2d6a4f' : 'white',
        color: active ? 'white' : '#333',
        fontWeight: 600,
        cursor: 'pointer',
    }
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

    if (cargando) return <p style={{ padding: '2rem' }}>Cargando métricas...</p>
    if (datos?.mensaje) return <p style={{ padding: '2rem' }}>{datos.mensaje}</p>
    if (!datos) return <p style={{ padding: '2rem' }}>No se pudieron cargar las métricas.</p>

    const ANIOS_OPTIONS = datos?.anios_disponibles || []
    const MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

    // Estilos reutilizables
    const estiloFiltroBlanco = { padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: 'white' }

    return (
        <section style={{ background: '#f4f7f5' }}>
            {/* CUADRO PRINCIPAL */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>

                {/* 4. JSX reconstruido para los filtros */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '6px', fontWeight: '500' }}>Mes</label>
                        <select
                            value={mesSeleccionado}
                            onChange={e => setMesSeleccionado(e.target.value)}
                            style={estiloFiltroBlanco}
                        >
                            <option value="">Todos</option>
                            {MESES.map(m => (
                                <option key={m} value={m}>{m}</option>
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

                    <button onClick={handleFiltrar} style={{ padding: '0.5rem 1rem', background: '#2d6a4f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        Filtrar
                    </button>
                    <button onClick={handleLimpiar} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        Limpiar
                    </button>
                </div>

                {/* Tarjetas internas del panel */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
                    <Tarjeta titulo="Total turnos" valor={datos.total_turnos} />
                    <Tarjeta titulo="Cancelados" valor={datos.cancelados} />
                    <Tarjeta titulo="Reservados" valor={datos.reservados} />
                    <Tarjeta titulo="Presentes" valor={datos.presentes} />
                    <Tarjeta titulo="Tasa de cancelación" valor={`${datos.tasa_cancelacion}%`} />
                </div>

                {/* 5. Área del Gráfico (Eliminamos el duplicado anterior) */}
                <h2 style={{ marginBottom: '1.2rem', color: '#1a3c2e', fontSize: '1.4rem' }}>Cancelaciones, reservas y presentes por mes</h2>
                {datos.grafico_por_mes?.length === 0 ? (
                    <p style={{ color: '#666' }}>No hay datos para el período seleccionado.</p>
                ) : (
                    <div style={{
                        background: '#f8f9fa',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        border: '1px solid #edf2f0'
                    }}>
                        <BarChart width={900} height={300} data={datos.grafico_por_mes}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="mes" stroke="#4a5568" />
                            <YAxis allowDecimals={false} stroke="#4a5568" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="cancelados" fill="#e63946" name="Cancelados" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="reservados" fill="#2d6a4f" name="Reservados" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="presentes" fill="#457b9d" name="Presentes" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </div>
                )}
            </div>
        </section>
    )
}

function AusentismoReporte({ user }) {
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')
    const [reporte, setReporte] = useState(null)
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState('')

    async function handleGenerar() {
        if (!fechaDesde || !fechaHasta) {
            setError('Seleccioná ambas fechas para generar el reporte.')
            return
        }

        setCargando(true)
        setError('')
        setReporte(null)

        try {
            const data = await getReporteAusentismo(user, fechaDesde, fechaHasta)
            setReporte(data)
        } catch (err) {
            setError(err.message || 'Error al consultar el reporte de ausentismo')
        } finally {
            setCargando(false)
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
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
                        background: '#2d6a4f', color: 'white', fontWeight: 600,
                        cursor: cargando ? 'default' : 'pointer', opacity: cargando ? 0.7 : 1,
                    }}
                >
                    {cargando ? 'Generando...' : 'Generar reporte'}
                </button>
            </div>

            {error && <p style={{ color: '#e63946' }}>{error}</p>}

            {reporte && reporte.ausencias.length === 0 && (
                <p>{reporte.mensaje || 'No se encontraron registros de ausentismo para el período seleccionado'}</p>
            )}

            {reporte && reporte.ausencias.length > 0 && (
                <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                <th style={{ padding: '0.6rem' }}>Paciente ID</th>
                                <th style={{ padding: '0.6rem' }}>Total ausencias</th>
                                <th style={{ padding: '0.6rem' }}>Fechas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reporte.ausencias.map((fila) => (
                                <tr key={fila.paciente_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '0.6rem' }}>{fila.paciente_id}</td>
                                    <td style={{ padding: '0.6rem' }}>{fila.total_ausencias}</td>
                                    <td style={{ padding: '0.6rem' }}>{fila.fechas.join(', ')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

function Tarjeta({ titulo, valor }) {
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
            <p style={{ color: '#718096', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500' }}>{titulo}</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1a3c2e' }}>{valor ?? 0}</p>
        </div>
    )
}
