import { ArrowLeft } from 'lucide-react'

import '../../styles/mobile-section-navigation.css'

export function MobileSectionMenu({
  title,
  description,
  titleId,
  options,
  onSelect,
}) {
  const optionButtons = []

  for (const option of options) {
    const Icon = option.Icon

    optionButtons.push(
      <button
        key={option.id}
        type="button"
        onClick={() => onSelect(option.id)}
      >
        <Icon size={34} strokeWidth={2.4} aria-hidden="true" />
        <span>{option.label}</span>
      </button>,
    )
  }

  return (
    <div className="mobile-section-menu">
      <div className="mobile-section-menu-heading">
        <h1 id={titleId}>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="mobile-section-options">{optionButtons}</div>
    </div>
  )
}

export function MobileSectionHeader({
  title,
  subtitle,
  backLabel,
  onBack,
}) {
  return (
    <div className="mobile-section-header">
      <button
        type="button"
        className="mobile-section-back"
        onClick={onBack}
        aria-label={backLabel}
      >
        <ArrowLeft size={20} strokeWidth={3} aria-hidden="true" />
      </button>

      <div className="mobile-section-heading">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  )
}
