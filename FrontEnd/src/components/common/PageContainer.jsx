function PageContainer({ title, subtitle, children }) {
  // Contenedor base para nuevas pantallas internas del sistema.
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5">
      <header>
        <h1 className="text-3xl font-black text-slate-950">{title}</h1>
        {subtitle && <p className="mt-1 font-semibold text-slate-500">{subtitle}</p>}
      </header>
      {children}
    </main>
  )
}

export default PageContainer
