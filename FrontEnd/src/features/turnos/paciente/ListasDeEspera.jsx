import { useEffect, useState } from 'react'
import { readStoredSession } from "../../../services/authService";

export default function PanelTurnosPaciente() {
    // Control de pestañas: 'mis_turnos' | 'solicitar' | 'lista_espera'
    const [pestanaActiva, setPestanaActiva] = useState('lista_espera')
    
    const [inscripciones, setInscripciones] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)

    // Cargar inscripciones desde el nuevo endpoint
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
        if (pestanaActiva === 'lista_espera') {
            cargarListaEspera()
        }
    }, [pestanaActiva])

    // Handler para cancelar lugar
    async function handleCancelarInscripcion(inscripcionId) {
        if (!confirm('¿Estás seguro de que deseas salir de esta lista de espera?')) return

        try {
            const session = readStoredSession()
            const token = session?.access_token

            const res = await fetch(`/api/v1/turnos/lista-espera/mis-inscripciones/${inscripcionId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })

            if (res.ok) {
                // Filtrar el elemento removido del estado local de inmediato
                setInscripciones(prev => prev.filter(item => item.inscripcion_id !== inscripcionId))
                alert('Inscripción cancelada exitosamente.')
            } else {
                alert('No se pudo cancelar la inscripción. Inténtalo de nuevo.')
            }
        } catch (e) {
            console.error(e)
            alert('Ocurrió un error en la comunicación con el servidor.')
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
        // Contenedor envolvente general (Fondo grisáceo de la app)
        <section style={{ padding: '2.5rem', background: '#f4f7f5', minHeight: '100vh' }}>
            
            {/* EL RECTÁNGULO OVALADO CLARO PRINCIPAL (Aísla las letras del fondo) */}
            <div style={{
                background: '#ffffff',
                borderRadius: '18px',                  // Bordes bien redondeados
                padding: '2.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)', // Sombra fina de elevación
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                <p style={{ color: '#2d6a4f', fontWeight: 'bold', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>KINEPRO</p>
                <h1 style={{ marginBottom: '2rem', color: '#1a3c2e', fontSize: '1.9rem' }}>Gestión de Turnos</h1>

                {/* Barra superior de Navegación por pestañas */}
                <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                    <button 
                        onClick={() => setPestanaActiva('mis_turnos')}
                        style={estiloBotonBlanco(pestanaActiva === 'mis_turnos' ? '#1a3c2e' : '#d1d5db')}
                    >
                        Mis turnos
                    </button>
                    <button 
                        onClick={() => setPestanaActiva('solicitar')}
                        style={estiloBotonBlanco(pestanaActiva === 'solicitar' ? '#1a3c2e' : '#d1d5db')}
                    >
                        Solicitar turno
                    </button>
                    <button 
                        onClick={() => setPestanaActiva('lista_espera')}
                        style={estiloBotonBlanco(pestanaActiva === 'lista_espera' ? '#2d6a4f' : '#d1d5db')}
                    >
                        Turnos en lista de espera
                    </button>
                </div>

                {/* CONTENIDO DINÁMICO DE LA PESTAÑA SELECCIONADA */}
                {pestanaActiva === 'mis_turnos' && (
                    <div style={{ color: '#555' }}>[Aquí va tu componente existente de "Mis turnos"]</div>
                )}

                {pestanaActiva === 'solicitar' && (
                    <div style={{ color: '#555' }}>[Aquí va tu componente existente de "Solicitar turno"]</div>
                )}

                {pestanaActiva === 'lista_espera' && (
                    <div>
                        <h2 style={{ fontSize: '1.3rem', color: '#1a3c2e', marginBottom: '1.2rem' }}>
                            Inscripciones activas en listas de espera
                        </h2>

                        {cargando && <p style={{ color: '#666' }}>Buscando tus inscripciones...</p>}
                        {error && <p style={{ color: '#e63946' }}>Hubo un error: {error}</p>}
                        
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
                                                Horario: {item.hora_inicio.slice(0,5)} hs a {item.hora_fin.slice(0,5)} hs
                                            </p>
                                            <p style={{ margin: '0.4rem 0 0 0', color: '#718096', fontSize: '0.8rem' }}>
                                                Te anotaste el: {new Date(item.fecha_inscripcion).toLocaleDateString()}
                                            </p>
                                        </div>

                                        {/* Bloque de Posición y Botón ovalado claro para cancelar */}
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
                                                onClick={() => handleCancelarInscripcion(item.inscripcion_id)}
                                                style={estiloBotonBlanco('#e63946')} // Estética blanca y borde rojo para cancelar
                                            >
                                                Cancelar lugar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}