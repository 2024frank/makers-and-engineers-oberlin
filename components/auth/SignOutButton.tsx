'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { portalLoginPath, type PrivatePortal } from '@/lib/auth/signOut'

export function SignOutButton({ portal }: { portal: PrivatePortal }) {
  const [busy, setBusy] = useState(false)
  async function signOut() {
    setBusy(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    window.location.assign(portalLoginPath(portal))
  }
  return (
    <button className="portal-sign-out" type="button" disabled={busy} onClick={() => void signOut()}>
      <LogOut size={15} aria-hidden="true" />
      <span className="portal-sign-out-label">{busy ? 'Signing out…' : 'Sign out'}</span>
    </button>
  )
}
