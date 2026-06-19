import { useEffect, useState } from 'react'
import {
  CalendarDays,
  ClipboardClock,
  Dumbbell,
  FileHeart,
} from 'lucide-react'

import {
  MobileSectionHeader,
  MobileSectionMenu,
} from '../../components/common'
import RoutineDetailModal from '../professionals/RoutineDetailModal'
import { getMyRoutine } from '../../services/routineService'
import '../../styles/treatment.css'

const MODULES = [
  {
    id: 'routine',
    title: 'Mi rutina',
    description: 'Consultá los días, bloques y ejercicios de tu rutina activa.',
    Icon: Dumbbell,
  },
  {
    id: 'history',
    title: 'Historial clínico',
    description: 'Revisá la información de tu seguimiento clínico.',
    Icon: FileHeart,
  },
  {
    id: 'sessions',
    title: 'Sesiones',
    description: 'Consultá el registro de tus sesiones de tratamiento.',
    Icon: ClipboardClock,
  },
]

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Sin fecha'
  }

  const dateParts = dateValue.split('-')

  if (dateParts.length !== 3) {
    return dateValue
  }

  return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
}

function getModuleById(moduleId) {
  for (const module of MODULES) {
    if (module.id === moduleId) {
      return module
    }
  }

  return MODULES[0]
}

function TreatmentPage({ user }) {
  const [activeModule, setActiveModule] = useState('routine')
  const [mobileModule, setMobileModule] = useState(null)
  const [routine, setRoutine] = useState(null)
  const [loadingRoutine, setLoadingRoutine] = useState(true)
  const [routineError, setRoutineError] = useState('')
  const [showRoutine, setShowRoutine] = useState(false)

  useEffect(() => {
    let pageIsActive = true

    async function loadInitialRoutine() {
      setLoadingRoutine(true)
      setRoutineError('')

      try {
        const routineData = await getMyRoutine(user)

        if (pageIsActive) {
          setRoutine(routineData)
        }
      } catch (error) {
        if (pageIsActive) {
          setRoutine(null)
          setRoutineError(error.message)
        }
      } finally {
        if (pageIsActive) {
          setLoadingRoutine(false)
        }
      }
    }

    loadInitialRoutine()

    return function cleanupRoutineRequest() {
      pageIsActive = false
    }
  }, [user])

  async function loadRoutine() {
    setLoadingRoutine(true)
    setRoutineError('')

    try {
      const routineData = await getMyRoutine(user)
      setRoutine(routineData)
    } catch (error) {
      setRoutine(null)
      setRoutineError(error.message)
    } finally {
      setLoadingRoutine(false)
    }
  }

  function handleSelectModule(moduleId) {
    setActiveModule(moduleId)
    setMobileModule(moduleId)
  }

  function handleBackToModules() {
    setMobileModule(null)
  }

  function handleOpenRoutine() {
    setShowRoutine(true)
  }

  function handleCloseRoutine() {
    setShowRoutine(false)
  }

  function renderRoutineContent() {
    if (loadingRoutine) {
      return <p className="treatment-status">Cargando tu rutina...</p>
    }

    if (!routine) {
      return (
        <div className="treatment-empty">
          <Dumbbell size={30} aria-hidden="true" />
          <h2>Todavía no tenés una rutina asignada</h2>
          <p>{routineError || 'Tu profesional podrá asignarte una próximamente.'}</p>
          <button type="button" onClick={loadRoutine}>
            Volver a consultar
          </button>
        </div>
      )
    }

    return (
      <article className="treatment-routine-card">
        <div className="treatment-routine-heading">
          <span>Rutina activa</span>
          <h2>{routine.titulo}</h2>
          <p>{routine.indicaciones_generales || 'Sin indicaciones generales'}</p>
        </div>

        <div className="treatment-routine-summary">
          <div>
            <CalendarDays size={18} aria-hidden="true" />
            <span>
              {formatDate(routine.fecha_inicio)} al {formatDate(routine.fecha_fin)}
            </span>
          </div>
          <strong>{routine.frecuencia}</strong>
          <span>{routine.ejercicios.length} ejercicios</span>
        </div>

        <button type="button" onClick={handleOpenRoutine}>
          Ver rutina completa
        </button>
      </article>
    )
  }

  function renderPendingModule(moduleId) {
    const module = getModuleById(moduleId)
    const Icon = module.Icon

    return (
      <div className="treatment-empty">
        <Icon size={30} aria-hidden="true" />
        <h2>{module.title}</h2>
        <p>Aún no hay información disponible en esta sección.</p>
      </div>
    )
  }

  function renderModuleContent(moduleId) {
    if (moduleId === 'routine') {
      return renderRoutineContent()
    }

    return renderPendingModule(moduleId)
  }

  function renderModuleButtons(className) {
    const buttons = []

    for (const module of MODULES) {
      const Icon = module.Icon
      let buttonClassName = ''

      if (activeModule === module.id) {
        buttonClassName = 'active'
      }

      buttons.push(
        <button
          key={module.id}
          type="button"
          className={buttonClassName}
          onClick={() => handleSelectModule(module.id)}
        >
          <Icon size={22} aria-hidden="true" />
          <span>
            <strong>{module.title}</strong>
            <small>{module.description}</small>
          </span>
        </button>,
      )
    }

    return <nav className={className}>{buttons}</nav>
  }

  const selectedMobileModule = getModuleById(mobileModule)

  return (
    <main className="staff-page treatment-page">
      <section className="staff-shell" aria-labelledby="treatment-title">
        <section className="staff-panel treatment-panel">
          <header className="treatment-header">
            <span>KinePro</span>
            <h1 id="treatment-title">Mi tratamiento</h1>
            <p>Tu información de seguimiento reunida en un solo lugar.</p>
          </header>

          <div className="treatment-desktop-layout">
            {renderModuleButtons('treatment-sidebar')}

            <section className="treatment-content">
              <header>
                <h2>{getModuleById(activeModule).title}</h2>
              </header>
              {renderModuleContent(activeModule)}
            </section>
          </div>

          <div className="treatment-mobile-layout">
            {mobileModule === null ? (
              <MobileSectionMenu
                title="Mi tratamiento"
                description="Elegí qué querés consultar."
                titleId="treatment-mobile-title"
                options={MODULES.map((module) => ({
                  id: module.id,
                  label: module.title,
                  Icon: module.Icon,
                }))}
                onSelect={handleSelectModule}
              />
            ) : (
              <section className="treatment-mobile-content">
                <MobileSectionHeader
                  title={selectedMobileModule.title}
                  subtitle="Mi tratamiento"
                  backLabel="Volver a las secciones de tratamiento"
                  onBack={handleBackToModules}
                />
                {renderModuleContent(mobileModule)}
              </section>
            )}
          </div>
        </section>
      </section>

      {showRoutine && routine && (
        <RoutineDetailModal
          routine={routine}
          canManage={false}
          deleting={false}
          onClose={handleCloseRoutine}
        />
      )}
    </main>
  )
}

export default TreatmentPage
