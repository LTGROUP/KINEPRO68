import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
const recoveryStorageKey = 'kinepro_password_recovery'

function saveRecoveryFlagFromUrl() {
  const hashHasRecovery = window.location.hash.includes('type=recovery')
  const searchHasRecovery = window.location.search.includes('type=recovery')

  if (hashHasRecovery || searchHasRecovery) {
    window.sessionStorage.setItem(recoveryStorageKey, 'true')
  }
}

export function hasPasswordRecoveryFlow() {
  const hashHasRecovery = window.location.hash.includes('type=recovery')
  const searchHasRecovery = window.location.search.includes('type=recovery')
  const storedRecovery = window.sessionStorage.getItem(recoveryStorageKey)

  if (hashHasRecovery || searchHasRecovery || storedRecovery === 'true') {
    return true
  }

  return false
}

export function clearPasswordRecoveryFlow() {
  window.sessionStorage.removeItem(recoveryStorageKey)
}

saveRecoveryFlagFromUrl()

export function getSupabaseConfigError() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return 'Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en FrontEnd/.env'
  }

  return ''
}

export const supabase = getSupabaseConfigError()
  ? null
  : createClient(supabaseUrl, supabaseAnonKey)
