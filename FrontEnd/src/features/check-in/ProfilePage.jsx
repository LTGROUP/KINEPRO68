import { useEffect, useState } from 'react'
import { QrCode } from 'lucide-react'

import QrScannerModal from './QrScannerModal'
import { changePassword, getMyProfile, updateMyProfile } from '../../services/authService'
import '../../styles/check-in.css'

function ProfilePage({ user }) {
  const [showScanner, setShowScanner] = useState(false)
  const [profile, setProfile] = useState(user)
  const [error, setError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
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
  const isPatient = user.rol === 'paciente'

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

  function handleOpenScanner() {
    setShowScanner(true)
  }

  function toggleEditProfile() {
    setShowEditProfile((current) => !current)
  }

  function toggleChangePassword() {
    setShowChangePassword((current) => !current)
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

  function handleCloseScanner() {
    setShowScanner(false)
  }

  function handlePasswordInputChange(event) {
    const { name, value } = event.target
    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }))
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
          <div className="staff-panel-header">
            <div>
              <h1 id="profile-title">Perfil</h1>
              <p>
                {profile.nombre} · {profile.rol}
              </p>
            </div>
          </div>

          <div className="profile-check-in-card">
            <div>
              <p className="staff-eyebrow">Mis datos</p>
              <h2>Datos personales</h2>
              <button type="button" className="staff-register-button" onClick={toggleEditProfile}>
                {showEditProfile ? 'Ocultar edición' : 'Editar datos'}
              </button>
              {showEditProfile && (
                <form className="auth-form" onSubmit={handleUpdateProfile}>
                  <label className="auth-field">
                    <span>Nombre</span>
                    <input
                      type="text"
                      name="nombre"
                      value={profileForm.nombre}
                      onChange={handleProfileInputChange}
                      required
                    />
                  </label>
                  <label className="auth-field">
                    <span>Apellido</span>
                    <input
                      type="text"
                      name="apellido"
                      value={profileForm.apellido}
                      onChange={handleProfileInputChange}
                      required
                    />
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
                    <span>Fecha de nacimiento</span>
                    <input
                      type="date"
                      name="fecha_nacimiento"
                      value={profileForm.fecha_nacimiento}
                      onChange={handleProfileInputChange}
                      required
                    />
                  </label>
                  <button className="auth-submit" type="submit" disabled={profileLoading}>
                    {profileLoading ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="profile-check-in-card">
            <div>
              <p className="staff-eyebrow">Asistencia</p>
              <h2>Registrar llegada al turno</h2>
              <p>
                Cuando llegues a la clínica, escaneá el QR de recepción para marcar tu
                asistencia.
              </p>
            </div>

            {isPatient ? (
              <button type="button" className="staff-register-button" onClick={handleOpenScanner}>
                <QrCode size={19} strokeWidth={3} aria-hidden="true" />
                Escanear QR
              </button>
            ) : (
              <p className="profile-check-in-note">
                Esta acción está disponible para pacientes.
              </p>
            )}
          </div>

          <div className="profile-check-in-card">
            <div style={{ width: '100%' }}>
              <p className="staff-eyebrow">Seguridad</p>
              <h2>Cambiar contraseña</h2>
              <p>Actualizá tu contraseña desde tu perfil con una clave más segura.</p>
              <button type="button" className="staff-register-button" onClick={toggleChangePassword}>
                {showChangePassword ? 'Ocultar cambio de contraseña' : 'Cambiar contraseña'}
              </button>
              {showChangePassword && (
                <form className="auth-form" onSubmit={handleChangePassword}>
                  <label className="auth-field">
                    <span>Contraseña actual</span>
                    <input
                      type="password"
                      name="current_password"
                      value={passwordForm.current_password}
                      onChange={handlePasswordInputChange}
                      required
                    />
                  </label>
                  <label className="auth-field">
                    <span>Nueva contraseña</span>
                    <input
                      type="password"
                      name="new_password"
                      value={passwordForm.new_password}
                      onChange={handlePasswordInputChange}
                      required
                    />
                  </label>
                  <label className="auth-field">
                    <span>Confirmar nueva contraseña</span>
                    <input
                      type="password"
                      name="confirm_password"
                      value={passwordForm.confirm_password}
                      onChange={handlePasswordInputChange}
                      required
                    />
                  </label>
                  <button className="auth-submit" type="submit" disabled={passwordLoading}>
                    {passwordLoading ? 'Actualizando...' : 'Cambiar contraseña'}
                  </button>
                </form>
              )}
            </div>
          </div>

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
        </section>
      </section>

      {showScanner && <QrScannerModal onClose={handleCloseScanner} />}
    </main>
  )
}

export default ProfilePage
