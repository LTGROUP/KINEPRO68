import { useEffect, useState } from 'react'
import { readStoredSession } from "../../../services/authService";

export default function VerListaDeEspera() {
    const [inscripciones, setInscripciones] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [mensajeExito, setMensajeExito] = useState('')

    // Estados para el modal de confirmación de baja
    const [modalCancelar, setModalCancelar] = useState(null) // guarda la inscripción a liberar

    // Cargar inscripciones desde el endpoint
    async function cargarListaEspera() {
        setCargando(true)
        setError(null)
        try {
            const session = readStoredSession()
            const token = session?.access_token

            const res = await fetch('/api/v1/turnos/lista-espera/mis-inscripciones', {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error('Error al cargar la lista de espera')

            const json = await res.json()
            setInscripciones(json.inscripciones)
        } catch (e) {
            setError(e.message)
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => {
        cargarListaEspera()
    }, [])

    useEffect(() => {
        if (!mensajeExito) return undefined

        const id = window.setTimeout(() => setMensajeExito(''), 5000)
        return () => window.clearTimeout(id)
    }, [mensajeExito])

    function abrirModalCancelar(inscripcion) {
        setModalCancelar(inscripcion)
    }

    // Handler para liberar el lugar en la lista de espera
    async function confirmarLiberarLugar() {
        const inscripcion = modalCancelar
        setModalCancelar(null)

        try {
            const session = readStoredSession()
            const token = session?.access_token

            const res = await fetch(`/api/v1/turnos/lista-espera/mis-inscripciones/${inscripcion.inscripcion_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })

            if (res.ok) {
                // Filtrar el elemento removido del estado local de inmediato
                setInscripciones(prev => prev.filter(item => item.inscripcion_id !== inscripcion.inscripcion_id))
                setMensajeExito('Liberaste tu lugar en la lista de espera correctamente.')
            } else {
                setError('No se pudo liberar el lugar. Inténtalo de nuevo.')
            }
        } catch (e) {
            console.error(e)
            setError('Ocurrió un error en la comunicación con el servidor.')
        }
    }

    // Estilo común para botones interactivos blancos con estética ovalada KINEPRO
    const estiloBotonBlanco = (colorBordeTexto) => ({
        padding: '0.6rem 1.4rem',
        borderRadius: '20px',                  // Súper redondeado/ovalado
        background: '#ffffff',                 // Fondo blanco pedido
        border: `2px solid ${colorBordeTexto}`, // Contorno según la acción
        color: colorBordeTexto,
        fontWeight: '600',
        fontSize: '0.88rem',
        cursor: 'pointer',
        boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none'
    })

    return (
        <div>
            {mensajeExito && (
                <p style={{ color: '#2d6a4f', background: '#e8f5e9', padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem' }}>
                    {mensajeExito}
                </p>
            )}
            {error && <p style={{ color: '#e63946' }}>Hubo un error: {error}</p>}

            {cargando && <p style={{ color: '#666' }}>Buscando tus inscripciones...</p>}

            {!cargando && !error && inscripciones.length === 0 ? (
                <p style={{ color: '#718096', fontStyle: 'italic' }}>
                    Actualmente no te encuentras anotado en ninguna lista de espera.
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {inscripciones.map((item) => (
                        /* Tarjeta de turno individual (ovalo claro interior) */
                        <div
                            key={item.inscripcion_id}
                            style={{
                                background: '#f8f9fa',
                                border: '1px solid #edf2f0',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '1rem'
                            }}
                        >
                            <div>
                                <span style={{
                                    background: '#e8f5e9',
                                    color: '#2d6a4f',
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    display: 'inline-block',
                                    marginBottom: '0.5rem'
                                }}>
                                    {item.area_treatment || item.area_tratamiento}
                                </span>
                                <h3 style={{ margin: '0 0 0.4rem 0', color: '#1a3c2e', fontSize: '1.1rem' }}>
                                    Fecha: {new Date(item.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })}
                                </h3>
                                <p style={{ margin: '0', color: '#4a5568', fontSize: '0.9rem' }}>
                                    Horario: {item.hora_inicio.slice(0, 5)} hs a {item.hora_fin.slice(0, 5)} hs
                                </p>
                                <p style={{ margin: '0.4rem 0 0 0', color: '#718096', fontSize: '0.8rem' }}>
                                    Te anotaste el: {new Date(item.fecha_inscripcion).toLocaleDateString()}
                                </p>
                            </div>

                            {/* Bloque de Posición y Botón ovalado claro para liberar el lugar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{ textAlign: 'center', paddingRight: '0.5rem' }}>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096', fontWeight: '500' }}>
                                        POSICIÓN
                                    </p>
                                    <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', color: '#2d6a4f' }}>
                                        #{item.posicion}
                                    </p>
                                </div>

                                <button
                                    onClick={() => abrirModalCancelar(item)}
                                    style={estiloBotonBlanco('#e63946')} // Estética blanca y borde rojo para liberar el lugar
                                >
                                    Liberar lugar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL DE CONFIRMACIÓN — mismo estilo que el de Mis turnos y el de lista de espera de secretaria */}
            {modalCancelar && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: '12px', padding: '32px',
                        maxWidth: '450px', width: '100%',
                        boxShadow: '0px 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ margin: '0 0 12px 0', color: '#111827', fontSize: '1.2rem' }}>
                            ¿Liberar tu lugar?
                        </h3>
                        <p style={{ color: '#4b5563', marginBottom: '24px' }}>
                            ¿Estás seguro de que deseas salir de esta lista de espera? Vas a perder tu posición actual.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setModalCancelar(null)}
                                style={{
                                    padding: '8px 20px', borderRadius: '6px', border: '1px solid #d1d5db',
                                    background: 'white', cursor: 'pointer', fontWeight: 'bold'
                                }}
                            >
                                Volver
                            </button>
                            <button
                                onClick={confirmarLiberarLugar}
                                style={{
                                    padding: '8px 20px', borderRadius: '6px', border: 'none',
                                    background: '#b91c1c', color: 'white', cursor: 'pointer', fontWeight: 'bold'
                                }}
                            >
                                Liberar lugar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
