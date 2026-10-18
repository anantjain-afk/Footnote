import { useEffect, useState } from 'react'
import { supabase, authConfigurationError } from '../lib/supabase'
import { AuthContext } from './authState'

function redirectError() {
    const query = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.slice(1))
    return query.get('error_description') || hash.get('error_description') || null
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(Boolean(supabase))
    const [error, setError] = useState(() => authConfigurationError || redirectError())

    useEffect(() => {
        if (!supabase) return
        let active = true
        let receivedAuthEvent = false

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!active) return
            receivedAuthEvent = true
            setUser(session?.user ?? null)
            setLoading(false)
            if (session) setError(null)
        })

        supabase.auth.getSession().then(({ data, error: sessionError }) => {
            if (!active) return
            if (sessionError) setError(sessionError.message)
            if (!receivedAuthEvent) setUser(data.session?.user ?? null)
        }).catch(() => {
            if (active) setError('Unable to restore your session. Please sign in again.')
        }).finally(() => {
            if (active) setLoading(false)
        })

        return () => {
            active = false
            subscription.unsubscribe()
        }
    }, [])

    const signOut = async () => {
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
        if (signOutError) throw signOutError
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, error, signOut, clearError: () => setError(null) }}>
            {children}
        </AuthContext.Provider>
    )
}
