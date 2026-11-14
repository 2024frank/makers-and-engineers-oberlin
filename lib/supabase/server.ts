import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import type { Database } from './database'

export async function createSupabaseServerClient() {
  // Mark server-client routes as dynamic before checking runtime env config so builds without Supabase env vars do not fail static prerendering.
  const requestHeaders = await headers()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('SUPABASE_PUBLIC_CONFIG_MISSING')
  // The phone app has no cookies. It sends the member's access token as a bearer token.
  const bearer = /^Bearer\s+(\S+)$/i.exec(requestHeaders.get('authorization') ?? '')?.[1]
  if (bearer) {
    const client = createClient<Database>(url, anonKey, { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const getUser = client.auth.getUser.bind(client.auth)
    client.auth.getUser = (jwt?: string) => getUser(jwt ?? bearer)
    return client
  }
  return cookieClient(url, anonKey, await cookies())
}

function cookieClient(url: string, anonKey: string, cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(items) {
        try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
        catch { /* Server Components cannot always mutate cookies; middleware/route handlers will. */ }
      }
    }
  })
}
