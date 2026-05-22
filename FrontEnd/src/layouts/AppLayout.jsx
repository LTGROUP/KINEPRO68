import AppNavbar from './AppNavbar'
import MobileBottomNav from './MobileBottomNav'

function AppLayout({ user, activeSection, onSectionChange, onLogout, children }) {
  return (
    <main className="app-layout">
      <AppNavbar
        user={user}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        onLogout={onLogout}
      />

      {/* Aca se renderiza la pantalla activa: personal, turnos, pacientes, etc. */}
      <section className="app-layout-content">{children}</section>

      <MobileBottomNav
        userRole={user.rol}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />
    </main>
  )
}

export default AppLayout
