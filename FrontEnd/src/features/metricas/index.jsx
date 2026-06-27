import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { readStoredSession } from '../../services/authService'

export function MetricasPage({ user }) {
    const [datos, setDatos] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [mesSeleccionado, setMesSeleccionado] = useState('')
    const [anioSeleccionado, setAnioSeleccionado] = useState('')

    const MESES_OPTIONS = [
        { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' },
        { value: '3', label: 'Marzo' }, { value: '4', label: 'Abril' },
        { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
        { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' },
        { value: '9', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
    ]

    const anioActual = new Date().getFullYear()

    async function cargar(mes = '', anio = '') {
        setCargando(true)
        try {
            const session = readStoredSession()
            const token = session?.access_token
            let url = '/api/v1/turnos/metricas'
            const params = []
            if (mes) params.push(`mes=${mes}`)
            if (anio) params.push(`anio=${anio}`)
            if (!mes && !anio) params.push('rango=ultimos_6_meses')
            if (params.length) url += '?' + params.join('&')

            const res = await fetch(url, {
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

    useEffect(() => { cargar() }, [])

    function handleFiltrar() {
        cargar(mesSeleccionado, anioSeleccionado)
    }

    function handleLimpiar() {
        setMesSeleccionado('')
        setAnioSeleccionado('')
        cargar()
    }

    // Estilo base unificado para los filtros y botones (Blancos con bordes redondeados y texto verde)
    const estiloFiltroBlanco = {
        padding: '0px 16px',
        borderRadius: '8px',               // Bordes ovalados consistentes
        border: '1px solid #2d6a4f',       // Contorno verde KINEPRO
        background: '#ffffff',             // Fondo blanco pedido
        color: '#2d6a4f',                  // Texto e iconos en verde
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '0.9rem',
        outline: 'none',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '40px',                    // Altura idéntica para alinear perfectamente
        boxSizing: 'border-box',
        transition: 'all 0.2s ease'
    }

    if (cargando) return <p style={{ padding: '2rem' }}>Cargando métricas...</p>
    if (datos?.mensaje) return <p style={{ padding: '2rem' }}>{datos.mensaje}</p>
    if (!datos) return <p style={{ padding: '2rem' }}>No se pudieron cargar las métricas.</p>

    const ANIOS_OPTIONS = datos?.anios_disponibles || []

    return (
        // Fondo general de la página en tono gris/verde sutil
        <section style={{ padding: '2rem', background: '#f4f7f5', minHeight: '100vh' }}>
            
            {/* CUADRO PRINCIPAL: El rectángulo ovalado blanco contenedor */}
            <div style={{ 
                background: '#ffffff', 
                borderRadius: '16px',               // Bordes bien redondeados/ovalados
                padding: '2.5rem', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)', // Sombra para separar del fondo
                maxWidth: '1050px',
                margin: '0 auto'
            }}>
                <p style={{ color: '#2d6a4f', fontWeight: 'bold', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>KINEPRO</p>
                <h1 style={{ marginBottom: '2rem', color: '#1a3c2e', fontSize: '2rem' }}>Métricas de cancelaciones</h1>

                {/* Filtros */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '6px', fontWeight: '500' }}>Mes</label>
                        <select
                            value={mesSeleccionado}
                            onChange={e => setMesSeleccionado(e.target.value)}
                            style={estiloFiltroBlanco}
                        >
                            <option value="">Todos</option>
                            {MESES_OPTIONS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
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

                    <button
                        onClick={handleFiltrar}
                        style={{ ...estiloFiltroBlanco, minWidth: '100px' }}
                    >
                        Filtrar
                    </button>

                    <button
                        onClick={handleLimpiar}
                        style={estiloFiltroBlanco}
                    >
                        Ver últimos 6 meses
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

                {/* Área del Gráfico */}
                <h2 style={{ marginBottom: '1.2rem', color: '#1a3c2e', fontSize: '1.4rem' }}>Cancelaciones, reservas y presentes por mes</h2>
                {datos.grafico_por_mes.length === 0 ? (
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

function Tarjeta({ titulo, valor }) {
    return (
        <div style={{
            background: '#f8f9fa',        // Fondo ligeramente gris para contrastar con el blanco del contenedor principal
            borderRadius: '12px',         // Bordes redondeados integrados al ecosistema
            padding: '1.5rem',
            border: '1px solid #edf2f0', 
            minWidth: '150px', 
            textAlign: 'center',
            flex: '1 1 160px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.01)'
        }}>
            <p style={{ color: '#718096', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500' }}>{titulo}</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1a3c2e' }}>{valor}</p>
        </div>
    )
}