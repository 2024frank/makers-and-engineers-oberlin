import { API_URL } from './config'
import { supabase } from './supabase'

export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code) }
}

type Options = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; form?: FormData }

/** Call the club website's API as the signed-in member. Throws ApiError with the server's error code. */
export async function api<T = unknown>(path: string, { method = 'GET', body, form }: Options = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ApiError(401, 'SIGNED_OUT')
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    })
  } catch { throw new ApiError(0, 'OFFLINE') }
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, typeof result?.error === 'string' ? result.error : `HTTP_${response.status}`)
  return result as T
}

const messages: Record<string, string> = {
  OFFLINE: 'Could not reach the club server. Check your connection and try again.',
  SIGNED_OUT: 'You are signed out. Sign in again.',
  ACTIVE_MEMBER_REQUIRED: 'Your member account must be approved and active.',
}
/** A sentence for an error. Pass screen-specific messages to cover that screen's error codes. */
export function errorMessage(error: unknown, extra: Record<string, string> = {}) {
  const code = error instanceof ApiError ? error.code : ''
  return extra[code] ?? messages[code] ?? 'That did not work. Please try again.'
}
