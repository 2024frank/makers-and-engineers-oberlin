'use client'

import { FormEvent, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { LiveStudioCanvas } from '@/components/public/LiveStudioCanvas'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const subscribeNoop = () => () => {}

export default function AdminLoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const resetNotice = useSyncExternalStore(
    subscribeNoop,
    () =>
      new URLSearchParams(window.location.search).get('status') === 'password_reset'
        ? 'Password updated. Sign in with your new password.'
        : '',
    () => '',
  )
  const statusMessage = notice || resetNotice
  const [busy, setBusy] = useState(false)
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') })
      if (authError) throw new Error('Sign-in failed. Check your officer email and password.')
      router.replace('/admin'); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign-in failed.') }
    finally { setBusy(false) }
  }
  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setRecoveryBusy(true); setError(''); setNotice('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/auth/staff/password-reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: String(form.get('email') ?? '') }) })
      if (!response.ok) throw new Error('Could not send a password reset right now.')
      setNotice('If that address belongs to an active officer, a password reset link was sent.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send password reset.') }
    finally { setRecoveryBusy(false) }
  }
  return (
    <main className="studio-auth">
      <div className="studio-auth__frame">
        <aside className="studio-auth__aside">
          <LiveStudioCanvas variant="subtle" />
          <div>
            <BrandLogo variant="badge" />
            <h1>Officer portal</h1>
            <p>Projects, events, membership, and website publishing.</p>
            <ul className="studio-auth__aside-specs">
              <li>Manage public club pages &amp; project directory</li>
              <li>Review member &amp; capstone applications</li>
              <li>Coordinate workshops, teams, and safety notes</li>
            </ul>
          </div>
          <Link className="studio-auth__back" href="/">
            Back to the club website
          </Link>
        </aside>
        <section className="studio-auth__main">
          <h2>Officer sign in</h2>
          <form className="studio-auth__form" onSubmit={submit}>
            <label>
              Email
              <input name="email" type="email" autoComplete="username" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <button type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <details className="password-recovery">
            <summary>Forgot your password?</summary>
            <form onSubmit={recover} className="studio-auth__form">
              <label>
                Officer email
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <button type="submit" disabled={recoveryBusy}>
                {recoveryBusy ? 'Sending…' : 'Email me a password reset'}
              </button>
            </form>
          </details>
          {error && (
            <p className="member-auth-message" role="alert">
              {error}
            </p>
          )}
          {statusMessage && (
            <p className="member-auth-message" role="status">
              {statusMessage}
            </p>
          )}
          <div className="studio-auth__links">
            <Link href="/member/login">Looking for Member portal sign in?</Link>
          </div>
        </section>
      </div>
    </main>
  )
}
