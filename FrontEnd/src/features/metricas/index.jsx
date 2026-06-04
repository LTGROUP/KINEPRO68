import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export function MetricasPage({ user }) {
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

    if (cargando) return <p style={{ padding: '2rem' }}>Cargando métricas...</p>
    if (datos?.mensaje) return <p style={{ padding: '2rem' }}>{datos.mensaje}</p>

    if (!datos) return <p style={{ padding: '2rem' }}>No se pudieron cargar las métricas.</p>

    return (
        <section style={{ padding: '2rem' }}>
            <p style={{ color: '#2d6a4f', fontWeight: 'bold', marginBottom: '0.5rem' }}>KINEPRO</p>
            <h1 style={{ marginBottom: '1.5rem' }}>Métricas de cancelaciones</h1>

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
        </section>
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