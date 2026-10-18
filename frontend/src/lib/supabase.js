import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function validateConfiguration() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return 'Sign-in is unavailable: the Supabase URL and public key are missing.'
  }
  try {
    const url = new URL(supabaseUrl)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid URL')
    if (supabaseAnonKey.split('.').length === 3) {
      const encoded = supabaseAnonKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      const claims = JSON.parse(atob(encoded))
      if (claims.role !== 'anon') return 'Sign-in requires a Supabase public key.'
      if (url.hostname.endsWith('.supabase.co') && claims.ref && url.hostname !== `${claims.ref}.supabase.co`) {
        return 'Sign-in is unavailable: the Supabase URL and public key belong to different projects.'
      }
    } else if (!supabaseAnonKey.startsWith('sb_publishable_')) {
      return 'Sign-in requires a Supabase public key.'
    }
  } catch {
    return 'Sign-in is unavailable: the Supabase configuration is invalid.'
  }
  return null
}

export const authConfigurationError = validateConfiguration()
export const supabase = authConfigurationError ? null : createClient(supabaseUrl, supabaseAnonKey)

export async function isGoogleSignInEnabled() {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/settings`, {
    headers: { apikey: supabaseAnonKey }, signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Unable to check Google sign-in. Please try again.')
  const settings = await response.json()
  return settings.external?.google === true
}
