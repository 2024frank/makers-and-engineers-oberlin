'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database'

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('SUPABASE_PUBLIC_CONFIG_MISSING')
  return createBrowserClient<Database>(url, anonKey)
}
