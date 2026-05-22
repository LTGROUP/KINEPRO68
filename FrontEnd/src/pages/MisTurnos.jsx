import { useState } from 'react';

export default function MisTurnos() {
    
    const turnosMockeados = [
        {
            id: 1,
            fecha: "25/06/2026",
            hora: "10:00",
            area: "Tren superior",
            estado: "Confirmado"
        },
        {
            id: 2,
            fecha: "28/06/2026",
            hora: "16:40",
            area: "Tren inferior",
            estado: "Pendiente"
        }
    ];

    const [turnos, setTurnos] = useState(turnosMockeados);

    const manejarCancelacion = (idDelTurno) => {
        const nuevaLista = turnos.filter((turno) => turno.id !== idDelTurno);
        setTurnos(nuevaLista);
    };
    
    return (
        <div>
            <h1>Mis Turnos Asignados</h1>
            {turnos.map((turno) => (
                <div key={turno.id} className="tarjeta-turno">
                    <h3>{turno.area}</h3>
                    <p>Fecha: {turno.fecha}</p>
                    <p>Hora: {turno.hora}</p>
                    <p>Estado: {turno.estado}</p>
                    <button onClick={() => manejarCancelacion(turno.id)}>
                        Cancelar Turno
                    </button>
                </div>
            ))}
        </div>
    );
}