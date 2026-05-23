import { useState } from 'react';

export default function AgendaDia() {
    
    // Datos mockeados simulando la vista administrativa
    const agendaMockeada = [
        {
            id: 1,
            hora: "08:00",
            paciente: "Juan Pérez",
            profesional: "Lic. Martín Gómez",
            area: "Tren superior",
            estado: "Confirmado"
        },
        {
            id: 2,
            hora: "08:40", // Turnos de 40 minutos
            paciente: "María López",
            profesional: "Lic. Ana Silva",
            area: "Tren inferior",
            estado: "Pendiente"
        },
        {
            id: 3,
            hora: "09:20",
            paciente: "Carlos Ruiz",
            profesional: "Lic. Martín Gómez",
            area: "Tren medio",
            estado: "Cancelado" // Alguien que avisó que no venía
        }
    ];

    const [turnosDelDia, setTurnosDelDia] = useState(agendaMockeada);

    // Lógica para actualizar un turno (no borrarlo, sino cambiar su estado)
    const marcarAsistencia = (idDelTurno) => {
        // En vez de .filter(), usamos .map() para recorrer. 
        // Si encontramos el turno, le cambiamos el estado. Si no, lo dejamos igual.
        const agendaActualizada = turnosDelDia.map((turno) => 
            turno.id === idDelTurno ? { ...turno, estado: "Presente" } : turno
        );
        setTurnosDelDia(agendaActualizada);
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Agenda del Día - 26/06/2026</h1>
            
            {/* Usamos una tabla clásica de HTML para que la secretaria vea todo ordenado */}
            <table style={{ width: '100%', textAlign: 'left', marginTop: '20px' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid black' }}>
                        <th>Hora</th>
                        <th>Paciente</th>
                        <th>Profesional</th>
                        <th>Área</th>
                        <th>Estado</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    {turnosDelDia.map((turno) => (
                        <tr key={turno.id} style={{ borderBottom: '1px solid gray', height: '40px' }}>
                            <td>{turno.hora}</td>
                            <td>{turno.paciente}</td>
                            <td>{turno.profesional}</td>
                            <td>{turno.area}</td>
                            <td>
                                {/* Un pequeño truco visual para destacar los estados */}
                                <span style={{ fontWeight: turno.estado === 'Presente' ? 'bold' : 'normal' }}>
                                    {turno.estado}
                                </span>
                            </td>
                            <td>
                                {/* Solo mostramos el botón si el paciente aún no está Presente o Cancelado */}
                                {turno.estado !== "Presente" && turno.estado !== "Cancelado" && (
                                    <button onClick={() => marcarAsistencia(turno.id)}>
                                        Dar Presente
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}