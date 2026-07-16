import { useEffect, useState } from 'react'
import { BarChart3, CalendarDays, CheckCircle2, Clock, UserCog, Users, XCircle } from 'lucide-react'

import { getAgendaDia } from '../services/turnosService'

const ACCESOS = [
  {
    id: 'turnos',
    Icon: CalendarDays,
    titulo: 'Agenda de hoy',
    descripcion: 'Ver la agenda del día',
  },
  {
    id: 'personal',
    Icon: UserCog,
    titulo: 'Gestión del personal',
    descripcion: 'Administrar el equipo',
  },
  {
    id: 'pacientes',
    Icon: Users,
    titulo: 'Pacientes',
    descripcion: 'Buscar y administrar pacientes',
  },
  {
    id: 'metricas',
    Icon: BarChart3,
    titulo: 'Métricas',
    descripcion: 'Ver reportes e indicadores',
  },
]

function capitalizar(texto) {
  if (!texto) return ''
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function formatearDiaHoy() {
  const hoy = new Date()
  const texto = hoy.toLocaleDateString('es-AR', {
    weekday: 'long',
  })
  return capitalizar(texto)
}

function formatearDetalleFechaHoy() {
  const hoy = new Date()
  return hoy.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function AdminHomePage({ user, setActiveSection }) {
  const [resumen, setResumen] = useState({ reservados: 0, presentes: 0, ausentes: 0, total: 0 })

  useEffect(() => {
    let cancelado = false

    async function cargarResumen() {
      try {
        const fechaStr = new Date().toLocaleDateString('en-CA', {
          timeZone: 'America/Argentina/Buenos_Aires',
        })
        const data = await getAgendaDia(user, fechaStr)
        const turnos = data?.turnos || []

        if (cancelado) return

        setResumen({
          reservados: turnos.filter((t) => t?.estado === 'reservado').length,
          presentes: turnos.filter((t) => t?.estado === 'presente').length,
          ausentes: turnos.filter((t) => t?.estado === 'ausente').length,
          total: turnos.length,
        })
      } catch (err) {
        console.error('No se pudo cargar el resumen de hoy', err)
        if (!cancelado) {
          setResumen({ reservados: 0, presentes: 0, ausentes: 0, total: 0 })
        }
      }
    }

    cargarResumen()

    return () => {
      cancelado = true
    }
  }, [user])

  return (
    <main className="staff-page">
      <section className="staff-shell" aria-labelledby="admin-home-title">
        <section className="staff-panel" aria-label="Inicio administrativo">
          <div className="staff-panel-header justify-center text-center">
            <div>
              <h1 id="admin-home-title" className="text-2xl font-black md:text-3xl">
                {formatearDiaHoy()}
              </h1>
              <p className="mt-1 text-base font-semibold text-[#61746f]">
                {formatearDetalleFechaHoy()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            {ACCESOS.map(({ id, Icon, titulo, descripcion }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className="flex flex-col items-start gap-2 rounded-2xl border border-[#d7e3df] bg-white p-5 text-left transition hover:border-[#176b5b] hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176b5b] text-white">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="font-bold text-[#12241f]">{titulo}</span>
                <span className="text-sm text-[#61746f]">{descripcion}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-[#d7e3df] bg-[#f4f9f7] p-5">
            <p className="text-sm font-bold uppercase tracking-wide text-[#176b5b]">
              Resumen de hoy
            </p>

            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-[#176b5b]" aria-hidden="true" />
                <span className="text-[#12241f]">
                  Reservados: <strong>{resumen.reservados}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600" aria-hidden="true" />
                <span className="text-[#12241f]">
                  Presentes: <strong>{resumen.presentes}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-red-600" aria-hidden="true" />
                <span className="text-[#12241f]">
                  Ausentes: <strong>{resumen.ausentes}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-[#176b5b]" aria-hidden="true" />
                <span className="text-[#12241f]">
                  Total: <strong>{resumen.total}</strong>
                </span>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

export default AdminHomePage
