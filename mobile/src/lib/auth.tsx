import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from './api'
import { supabase } from './supabase'

export type Member = { userId: string; email: string; displayName: string; status: 'ACTIVE'; classYear: number | null; major: string | null; disciplines: string[]; skills: string[] }
type Me = { member: Member; unreadNotifications: number }
type State =
  | { status: 'loading' }
  | { status: 'signedOut' }
  /** Signed in, but the account is not an approved, active member (or the server could not be reached). */
  | { status: 'blocked'; reason: 'NOT_ACTIVE' | 'OFFLINE' }
  | { status: 'ready'; member: Member }

type Auth = {
  state: State
  unread: number
  /** Re-read the member record and unread count from the server. */
  refresh: () => Promise<void>
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}
const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) { setState({ status: 'signedOut' }); return }
    try {
      const me = await api<Me>('/api/mobile/me')
      setUnread(me.unreadNotifications); setState({ status: 'ready', member: me.member })
    } catch (error) {
      const offline = error instanceof ApiError && (error.status === 0 || error.status >= 500)
      // Keep a member who is already in the app where they are when the network drops.
      setState(current => offline && current.status === 'ready' ? current : { status: 'blocked', reason: offline ? 'OFFLINE' : 'NOT_ACTIVE' })
    }
  }, [])

  useEffect(() => {
    void refresh()
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { setUnread(0); setState({ status: 'signedOut' }) }
    })
    return () => data.subscription.unsubscribe()
  }, [refresh])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) return error.status === 400 ? 'That email and password do not match.' : 'Could not sign in. Check your connection and try again.'
    await refresh()
    return null
  }, [refresh])

  const signOut = useCallback(async () => { await supabase.auth.signOut({ scope: 'local' }) }, [])

  const value = useMemo(() => ({ state, unread, refresh, signIn, signOut }), [state, unread, refresh, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside AuthProvider')
  return auth
}
/** The signed-in member. Only call on screens behind the auth gate. */
export function useMember() {
  const { state } = useAuth()
  if (state.status !== 'ready') throw new Error('useMember needs a signed-in member')
  return state.member
}
