export function getEstadoClass(estado) {
  if (estado === 'reservado') return 'turnos-badge reservado'
  if (estado === 'cancelado') return 'turnos-badge cancelado'
  if (estado === 'presente')  return 'turnos-badge presente'
  if (estado === 'ausente')   return 'turnos-badge ausente'
  return 'turnos-badge'
}
