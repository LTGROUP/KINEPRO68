function Card({ children, className = '' }) {
  // Caja blanca reutilizable para listados, formularios o bloques de informacion.
  const cardClass = `rounded-2xl bg-white p-5 shadow-xl shadow-emerald-950/10 ${className}`

  return (
    <section className={cardClass}>{children}</section>
  )
}

export default Card
