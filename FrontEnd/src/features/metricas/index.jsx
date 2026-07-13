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

            {tab === 'cancelaciones' && <CancelacionesReporte />}
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

function CancelacionesReporte() {
    const [datos, setDatos] = useState(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        async function cargar() {
            try {
                const session = JSON.parse(localStorage.getItem('kinepro_session'))
                const token = session?.access_token
                const res = await fetch('/api/v1/turnos/metricas', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const json = await res.json()
                setDatos(json)
            } catch (e) {
                console.error(e)
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [])

    if (cargando) return <p>Cargando métricas...</p>
    if (datos?.mensaje) return <p>{datos.mensaje}</p>
    if (!datos) return <p>No se pudieron cargar las métricas.</p>

    return (
        <>
            {/* Tarjetas */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                <Tarjeta titulo="Total turnos" valor={datos.total_turnos} />
                <Tarjeta titulo="Cancelados" valor={datos.cancelados} />
                <Tarjeta titulo="Reservados" valor={datos.reservados} />
                <Tarjeta titulo="Presentes" valor={datos.presentes} />
                <Tarjeta titulo="Tasa de cancelación" valor={`${datos.tasa_cancelacion}%`} />
            </div>

            {/* Gráfico */}
            <h2 style={{ marginBottom: '1rem' }}>Cancelaciones, reservas y presentes por mes</h2>
            {datos.grafico_por_mes.length === 0 ? (
                <p>No hay datos registrados por mes.</p>
            ) : (
                <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <BarChart width={900} height={300} data={datos.grafico_por_mes}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="cancelados" fill="#e63946" name="Cancelados" />
                        <Bar dataKey="reservados" fill="#2d6a4f" name="Reservados" />
                        <Bar dataKey="presentes" fill="#457b9d" name="Presentes" />
                    </BarChart>
                </div>
            )}
        </>
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
            background: 'white', borderRadius: '8px', padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minWidth: '150px', textAlign: 'center'
        }}>
            <p style={{ color: '#666', fontSize: '0.85rem' }}>{titulo}</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1a3c2e' }}>{valor}</p>
        </div>
    )
}