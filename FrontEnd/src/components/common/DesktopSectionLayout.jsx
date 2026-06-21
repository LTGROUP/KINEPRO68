import '../../styles/desktop-section-layout.css'

function DesktopSectionLayout({
  options,
  activeSection,
  onSelect,
  contentTitle,
  showContentTitle = true,
  children,
}) {
  const optionButtons = []

  for (const option of options) {
    const Icon = option.Icon
    let buttonClassName = ''

    if (activeSection === option.id) {
      buttonClassName = 'active'
    }

    optionButtons.push(
      <button
        key={option.id}
        type="button"
        className={buttonClassName}
        onClick={() => onSelect(option.id)}
      >
        <Icon size={22} aria-hidden="true" />
        <span>
          <strong>{option.label}</strong>
          {option.description && <small>{option.description}</small>}
        </span>
      </button>,
    )
  }

  return (
    <div className="desktop-section-layout">
      <nav className="desktop-section-sidebar" aria-label="Secciones">
        {optionButtons}
      </nav>

      <section className="desktop-section-content">
        {showContentTitle && (
          <header>
            <h2>{contentTitle}</h2>
          </header>
        )}
        {children}
      </section>
    </div>
  )
}

export default DesktopSectionLayout
