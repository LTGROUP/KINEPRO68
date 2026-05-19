import { useEffect, useRef, useState } from 'react'
import { getCountries, getCountryCallingCode } from 'react-phone-number-input'

const LATAM_COUNTRIES = [
  'AR',
  'BO',
  'BR',
  'CL',
  'CO',
  'CR',
  'CU',
  'DO',
  'EC',
  'SV',
  'GT',
  'HN',
  'MX',
  'NI',
  'PA',
  'PY',
  'PE',
  'PR',
  'UY',
  'VE',
]

function getFlagEmoji(countryCode) {
  // Convierte "AR" en la bandera correspondiente usando códigos regionales Unicode.
  if (!countryCode) {
    return ''
  }

  return countryCode
    .toUpperCase()
    .replace(/./g, (character) =>
      String.fromCodePoint(127397 + character.charCodeAt()),
    )
}

function CountryCodeSelect({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const allCountries = getCountries()
  // Dejamos Latinoamérica primero para que los países más probables aparezcan arriba.
  const countries = [
    ...LATAM_COUNTRIES.filter((country) => allCountries.includes(country)),
    ...allCountries.filter((country) => !LATAM_COUNTRIES.includes(country)),
  ]
  const selectedCountry = value || 'AR'

  function handleSelect(country) {
    onChange(country)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) {
      return undefined
    }

    // Cierra el selector si el usuario hace click afuera o presiona Escape.
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="country-code-select" ref={containerRef}>
      <button
        type="button"
        className="country-code-trigger"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        disabled={disabled}
        aria-expanded={open}
      >
        <span>{getFlagEmoji(selectedCountry)}</span>
        <span>+{getCountryCallingCode(selectedCountry)}</span>
      </button>

      {open && (
        <div className="country-code-menu" role="listbox">
          {countries.map((country) => (
            <button
              type="button"
              className="country-code-option"
              key={country}
              onClick={() => handleSelect(country)}
              role="option"
              aria-selected={country === selectedCountry}
            >
              <span>{getFlagEmoji(country)}</span>
              <span>+{getCountryCallingCode(country)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default CountryCodeSelect
