function TextInput({
  label,
  error,
  className = '',
  name,
  type = 'text',
  value,
  placeholder,
  required = false,
  disabled = false,
  onChange,
}) {
  // Campo de texto base. El label y el error quedan siempre con el mismo estilo.
  const labelClass = `grid gap-1.5 text-sm font-bold text-slate-700 ${className}`

  return (
    <label className={labelClass}>
      {label}
      <input
        className="min-h-11 rounded-lg border border-emerald-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        onChange={onChange}
      />
      {error && <span className="text-sm font-semibold text-red-600">{error}</span>}
    </label>
  )
}

export default TextInput
