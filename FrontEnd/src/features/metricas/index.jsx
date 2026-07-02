import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
// import { readStoredSession } from '../../services/authService' // Asegúrate de usarlo si lo necesitas

export function MetricasPage({ user }) {
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
        <section style={{ padding: '2rem', background: '#f4f7f5', minHeight: '100vh' }}>
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