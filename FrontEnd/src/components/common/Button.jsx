const variants = {
  primary: 'bg-emerald-700 text-white hover:bg-emerald-800',
  secondary: 'bg-white text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

function getButtonVariantClass(variant) {
  if (variants[variant]) {
    return variants[variant]
  }

  return variants.primary
}

function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  disabled = false,
  onClick,
}) {
  // Boton base para acciones comunes. Se puede cambiar el color con la prop variant.
  const variantClass = getButtonVariantClass(variant)
  const buttonClass = `min-h-11 rounded-lg px-4 font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClass} ${className}`

  return (
    <button
      className={buttonClass}
      type={type}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default Button
