// PostgREST sometimes rejects a session token in the same second Supabase Auth issued it,
// answering 401 with code PGRST303 (JWT claims validation failed). The server refreshes
// expired tokens on demand, so the first query after a refresh can hit this. In production
// it made getCurrentAdmin() read "no officer role", which sent an officer's email send to
// the login page. PostgREST never ran the rejected request, so repeating it once, after the
// issuing second has passed, is safe for reads and writes alike.
export const FRESH_TOKEN_RETRY_DELAY_MS = 1100

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// supabase-js passes a URL string and a plain init. A Request object's body can only be
// read once, so those are never retried.
function retryableUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return null
}

export function createFreshTokenFetch(
  // Looked up per call so Next.js's patched global fetch is the one used.
  baseFetch: typeof fetch = (input, init) => fetch(input, init),
  delayMs: number = FRESH_TOKEN_RETRY_DELAY_MS,
): typeof fetch {
  return async (input, init) => {
    const response = await baseFetch(input, init)
    if (response.status !== 401 || !retryableUrl(input)?.includes('/rest/v1/')) return response
    const body = await response.clone().json().catch(() => null) as { code?: unknown } | null
    if (body?.code !== 'PGRST303') return response
    await wait(delayMs)
    return baseFetch(input, init)
  }
}
