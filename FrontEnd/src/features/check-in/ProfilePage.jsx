import { useEffect, useState } from 'react'
import { Eye, EyeOff, Headphones, Lock, UserRound } from 'lucide-react'

import {
  MobileSectionHeader,
  MobileSectionMenu,
} from '../../components/common'
import { changePassword, getMyProfile, updateMyProfile } from '../../services/authService'
import '../../styles/check-in.css'

function shouldStartWithProfileMenu() {
  return window.matchMedia('(max-width: 760px)').matches
}

function getProfileSectionTitle(activeProfileSection) {
  if (activeProfileSection === 'datos')
    return 'Datos Personales'
  if (activeProfileSection === 'seguridad') {
    return 'Seguridad'
  }
  if (activeProfileSection === 'soporte') {
    return 'Soporte'
  }
}

function ProfilePage({ user }) {
  const [profile, setProfile] = useState(user)
  const [error, setError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  const [activeProfileSection, setActiveProfileSection] = useState(() => {
    if (shouldStartWithProfileMenu()) {
      return 'menu'
    }
    return 'datos'
  })

  const [isMobile, setIsMobile] = useState(shouldStartWithProfileMenu)
  const [supportCategory, setSupportCategory] = useState('')
  const [supportDetail, setSupportDetail] = useState('')
  const supportPhone = '5492215383928'
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profileForm, setProfileForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    obra_social: '',
    fecha_nacimiento: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      try {
        const response = await getMyProfile(user)

        if (isMounted) {
          setProfile((previous) => ({
            ...previous,
            ...response,
          }))
          setProfileForm({
            nombre: response.nombre || '',
            apellido: response.apellido || '',
            telefono: response.telefono || '',
            email: response.email || '',
            obra_social: response.obra_social || '',
            fecha_nacimiento: response.fecha_nacimiento || '',
          })
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message)
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [user])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 760px)')

    function handleScreenChange(event) {
      setIsMobile(event.matches)
    }

    mediaQuery.addEventListener('change', handleScreenChange)

    return () => {
      mediaQuery.removeEventListener('change', handleScreenChange)
    }
  }, [])

  function toggleEditProfile() {
    setShowEditProfile((current) => !current)
  }

  function toggleChangePassword() {
    setShowChangePassword((current) => !current)
  }

  function changeProfileSection(sectionName) {
    setActiveProfileSection(sectionName)
    setError('')
    setPasswordMessage('')
    setProfileMessage('')
    if (sectionName !== 'soporte') {

      setSupportCategory('')
      setSupportDetail('')
    }
  }

  function handleOpenWhatsAppSupport(event) {
    event.preventDefault()

    setError('')

    if (!supportCategory) {
      setError('Debe seleccionar el motivo de la consulta')
      return
    }

    const message = `
      Hola, necesito soporte con KinePro.

      Categoría: ${supportCategory}
      Usuario: ${profile.nombre || ''} ${profile.apellido || ''}
      DNI: ${profile.dni || 'Sin cargar'}
      ${supportDetail ? ` Detalle: ${supportDetail}` : ''}`
    const whatsappUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent(message)}`
    const supportWindow = window.open(whatsappUrl, '_blank')

    if (!supportWindow) {
      setError('El navegador bloqueó la ventana de WhatsApp')
      return
    }

    supportWindow.opener = null
    setSupportCategory('')
    setSupportDetail('')
  }


  function handleProfileInputChange(event) {
    const { name, value } = event.target
    setProfileForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleUpdateProfile(event) {
    event.preventDefault()
    if (profileLoading) return

    setError('')
    setProfileMessage('')
    setProfileLoading(true)

    try {
      const updated = await updateMyProfile(user, profileForm)
      setProfile((previous) => ({
        ...previous,
        ...updated,
      }))
      setProfileMessage('Datos actualizados con éxito')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setProfileLoading(false)
    }
  }

  function handlePasswordInputChange(event) {
    const { name, value } = event.target
    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function toggleCurrentPassword() {
    setShowCurrentPassword((currentValue) => !currentValue)
  }

  function toggleNewPassword() {
    setShowNewPassword((currentValue) => !currentValue)
  }

  function toggleConfirmPassword() {
    setShowConfirmPassword((currentValue) => !currentValue)
  }

  function getPasswordType(showPassword) {
    if (showPassword) {
      return 'text'
    }

    return 'password'
  }

  function getPasswordLabel(showPassword) {
    if (showPassword) {
      return 'Ocultar contraseña'
    }

    return 'Mostrar contraseña'
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    if (passwordLoading) return

    setError('')
    setPasswordMessage('')

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('La nueva contraseña y su confirmación no coinciden')
      return
    }

    setPasswordLoading(true)
    try {
      const response = await changePassword(user, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setPasswordMessage(response.message)
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <main className="staff-page">
      <section className="staff-shell" aria-labelledby="profile-title">
        <section className="staff-panel profile-panel" aria-label="Perfil">

          {activeProfileSection === 'menu' ? (
            <MobileSectionMenu
              title="Mi cuenta"
              description="Elegí qué querés consultar."
              titleId="profile-title"
              options={[
                { id: 'datos', label: 'Datos personales', Icon: UserRound },
                { id: 'seguridad', label: 'Seguridad', Icon: Lock },
                { id: 'soporte', label: 'Soporte', Icon: Headphones },
              ]}
              onSelect={changeProfileSection}
            />
          ) : (
            <>
              <MobileSectionHeader
                title={getProfileSectionTitle(activeProfileSection)}
                subtitle="Mi cuenta"
                backLabel="Volver al menú de perfil"
                onBack={() => changeProfileSection('menu')}
              />

              <div className="profile-sections-layout">
                {!isMobile && (
                <aside className="profile-sections-menu" aria-label="Secciones del perfil">
                  <p className="staff-eyebrow">Secciones</p>
                  <button
                    type="button"
                    className={activeProfileSection === 'datos' ? 'active' : ''}
                    onClick={() => changeProfileSection('datos')}
                  >
                    Datos personales
                  </button>

                  <button
                    type="button"
                    className={activeProfileSection === 'seguridad' ? 'active' : ''}
                    onClick={() => changeProfileSection('seguridad')}
                  >
                    Seguridad
                  </button>

                  <button
                    type="button"
                    className={activeProfileSection === 'soporte' ? 'active' : ''}
                    onClick={() => changeProfileSection('soporte')}
                  >
                    Soporte
                  </button>
                </aside>
                )}
            {activeProfileSection === 'datos' && (
              <section className="profile-card" aria-label="Datos personales">
                <div className="profile-card-title">
                  <div>
                    <p className="staff-eyebrow">Mis datos</p>
                    <h2>Datos personales</h2>
                  </div>
                </div>

                {!showEditProfile && (
                  <dl className="profile-data-list">
                    <div>
                      <dt>Nombre</dt>
                      <dd>{profile.nombre || 'Sin cargar'}</dd>
                    </div>
                    <div>
                      <dt>Apellido</dt>
                      <dd>{profile.apellido || 'Sin cargar'}</dd>
                    </div>
                    <div>
                      <dt>DNI</dt>
                      <dd>{profile.dni || 'Sin cargar'}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{profile.email || 'Sin cargar'}</dd>
                    </div>
                    <div>
                      <dt>Teléfono</dt>
                      <dd>{profile.telefono || 'Sin cargar'}</dd>
                    </div>
                    <div>
                      <dt>Obra social</dt>
                      <dd>{profile.obra_social || 'Sin obra social'}</dd>
                    </div>
                    <div>
                      <dt>Fecha de nacimiento</dt>
                      <dd>{profile.fecha_nacimiento || 'Sin cargar'}</dd>
                    </div>
                    <div>
                      <dt>Rol</dt>
                      <dd>{profile.rol || 'Sin cargar'}</dd>
                    </div>
                  </dl>
                )}

                {showEditProfile && (
                  <form className="auth-form profile-form" onSubmit={handleUpdateProfile}>
                    <label className="auth-field">
                      <span>Nombre (no editable)</span>
                      <input type="text" name="nombre" value={profileForm.nombre} disabled />
                    </label>
                    <label className="auth-field">
                      <span>Apellido (no editable)</span>
                      <input type="text" name="apellido" value={profileForm.apellido} disabled />
                    </label>
                    <label className="auth-field">
                      <span>DNI (no editable)</span>
                      <input type="text" value={profile.dni || ''} disabled />
                    </label>
                    <label className="auth-field">
                      <span>Email</span>
                      <input
                        type="email"
                        name="email"
                        value={profileForm.email}
                        onChange={handleProfileInputChange}
                        required
                      />
                    </label>
                    <label className="auth-field">
                      <span>Teléfono</span>
                      <input
                        type="text"
                        name="telefono"
                        value={profileForm.telefono}
                        onChange={handleProfileInputChange}
                        required
                      />
                    </label>
                    <label className="auth-field">
                      <span>Obra social</span>
                      <input
                        type="text"
                        name="obra_social"
                        value={profileForm.obra_social}
                        onChange={handleProfileInputChange}
                        required
                      />
                    </label>
                    <label className="auth-field">
                      <span>Fecha de nacimiento (no editable)</span>
                      <input type="date" name="fecha_nacimiento" value={profileForm.fecha_nacimiento} disabled />
                    </label>
                    <button className="auth-submit" type="submit" disabled={profileLoading}>
                      {profileLoading ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </form>
                )}
                <button
                  type="button"
                  className="staff-register-button profile-edit-toggle"
                  onClick={toggleEditProfile}
                >
                  {showEditProfile ? 'Ocultar edición' : 'Editar datos'}
                </button>
              </section>
            )}

            {activeProfileSection === 'seguridad' && (
              <section className="profile-card" aria-label="Seguridad">
                <div className="profile-card-title">
                  <div>
                    <p className="staff-eyebrow">Seguridad</p>
                    <h2>Cambiar contraseña</h2>
                  </div>
                  <button type="button" className="staff-register-button" onClick={toggleChangePassword}>
                    {showChangePassword ? 'Ocultar cambio' : 'Cambiar'}
                  </button>
                </div>
                <p className="profile-card-text">
                  Actualizá tu contraseña desde tu perfil con una clave más segura.
                </p>
                <p className="profile-password-hint">
                  Los requisitos de la contraseña son: mínimo 8 caracteres, al menos una letra
                  mayúscula y al menos un número.
                </p>
                {showChangePassword && (
                  <form className="auth-form profile-form" onSubmit={handleChangePassword}>
                    <label className="auth-field">
                      <span>Contraseña actual</span>
                      <div className="password-input-wrap">
                        <input
                          type={getPasswordType(showCurrentPassword)}
                          name="current_password"
                          value={passwordForm.current_password}
                          onChange={handlePasswordInputChange}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={toggleCurrentPassword}
                          aria-label={getPasswordLabel(showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOff size={20} strokeWidth={2.4} aria-hidden="true" />
                          ) : (
                            <Eye size={20} strokeWidth={2.4} aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </label>
                    <label className="auth-field">
                      <span>Nueva contraseña</span>
                      <div className="password-input-wrap">
                        <input
                          type={getPasswordType(showNewPassword)}
                          name="new_password"
                          value={passwordForm.new_password}
                          onChange={handlePasswordInputChange}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={toggleNewPassword}
                          aria-label={getPasswordLabel(showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff size={20} strokeWidth={2.4} aria-hidden="true" />
                          ) : (
                            <Eye size={20} strokeWidth={2.4} aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </label>
                    <label className="auth-field">
                      <span>Confirmar nueva contraseña</span>
                      <div className="password-input-wrap">
                        <input
                          type={getPasswordType(showConfirmPassword)}
                          name="confirm_password"
                          value={passwordForm.confirm_password}
                          onChange={handlePasswordInputChange}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={toggleConfirmPassword}
                          aria-label={getPasswordLabel(showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={20} strokeWidth={2.4} aria-hidden="true" />
                          ) : (
                            <Eye size={20} strokeWidth={2.4} aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </label>
                    <button className="auth-submit" type="submit" disabled={passwordLoading}>
                      {passwordLoading ? 'Actualizando...' : 'Cambiar contraseña'}
                    </button>
                  </form>
                )}
              </section>
            )}

            {activeProfileSection === 'soporte' && (
              <section className="profile-card" aria-label="Soporte">
                <div className="profile-card-title">
                  <div>
                    <p className="staff-eyebrow">Soporte</p>
                    <h2>Contactar soporte</h2>
                  </div>
                </div>

                <p className="profile-card-text">
                  Contactate con soporte mediante WhatsApp. El sistema incluirá tus datos básicos para agilizar la atención.
                </p>

                <form className="auth-form profile-form" onSubmit={handleOpenWhatsAppSupport}>
                  <label className="auth-field">
                    <span>Categoría del inconveniente</span>
                    <select
                      value={supportCategory}
                      onChange={(event) => setSupportCategory(event.target.value)}
                      required
                    >
                      <option value="" disabled hidden>Elegí el motivo de la consulta</option>
                      <option value="Problema con contraseña">Problema con contraseña</option>
                      <option value="Problema con datos personales">Problema con datos personales</option>
                      <option value="Problema con turnos">Problema con turnos</option>
                      <option value="Problema con QR">Problema con QR</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </label>

                  <label className="auth-field">
                    <span>Detalle opcional</span>
                    <textarea
                      value={supportDetail}
                      onChange={(event) => setSupportDetail(event.target.value)}
                      placeholder="Describí brevemente el inconveniente..."
                      rows="5"
                    />
                  </label>

                  <button className="auth-submit" type="submit">
                    Contactar por WhatsApp
                  </button>

                  <p className="mt-4 text-center text-sm text-slate-500">
                    O contactate al : <span className="font-semibold">{supportPhone}</span>
                  </p>

                </form>
              </section>
            )}

          {error && (
            <p className="auth-message error" role="alert">
              {error}
            </p>
          )}
          {passwordMessage && (
            <p className="auth-message success" role="status">
              {passwordMessage}
            </p>
          )}
          {profileMessage && (
            <p className="auth-message success" role="status">
              {profileMessage}
            </p>
          )}
        </div>
        </>
        )}
        </section>
      </section>
    </main>
  )
}

export default ProfilePage
