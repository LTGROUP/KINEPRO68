import {
  BarChart3,
  CalendarDays,
  CircleUser,
  Home,
  UserCog,
  Users,
} from 'lucide-react'

// Cada item representa una pantalla principal de la app.
// Si un rol no esta en "roles", ese usuario no ve la opcion.
export const NAV_ITEMS = [
  {
    id: 'inicio',
    label: 'Inicio',
    shortLabel: 'Inicio',
    Icon: Home,
    roles: ['paciente', 'profesional', 'secretaria', 'administrativo'],
  },
  {
    id: 'turnos',
    label: 'Turnos',
    shortLabel: 'Turnos',
    Icon: CalendarDays,
    roles: ['paciente', 'profesional', 'secretaria', 'administrativo'],
  },
  {
    id: 'pacientes',
    label: 'Pacientes',
    shortLabel: 'Pac.',
    Icon: Users,
    roles: ['secretaria', 'administrativo'],
  },
  {
    id: 'personal',
    label: 'Gestión del personal',
    shortLabel: 'Personal',
    Icon: UserCog,
    roles: ['secretaria', 'administrativo'],
  },
  {
    id: 'metricas',
    label: 'Métricas',
    shortLabel: 'Métricas',
    Icon: BarChart3,
    roles: ['administrativo'],
  },
  {
    id: 'perfil',
    label: 'Perfil',
    shortLabel: 'Perfil',
    Icon: CircleUser,
    roles: ['paciente', 'profesional', 'secretaria', 'administrativo'],
  },
]

export function getNavigationForRole(role) {
  const allowedItems = []

  for (const item of NAV_ITEMS) {
    if (item.roles.includes(role)) {
      allowedItems.push(item)
    }
  }

  return allowedItems
}
