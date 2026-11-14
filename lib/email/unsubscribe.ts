import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { unsubscribeSiteOrigin } from './siteOrigin'

/** The route that shows the confirm page (GET) and records the opt-out (POST). */
export const UNSUBSCRIBE_PATH = '/unsubscribe'

// Bound into every signature so the same secret can sign other things without overlap.
const TOKEN_CONTEXT = 'announcement-unsubscribe:v1:'
const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const SIGNATURE = /^[A-Za-z0-9_-]{43}$/

// The service-role key is the one server-only secret that every environment able to
// load member addresses already has, so an announcement never goes out without a
// working unsubscribe link. It is used only as HMAC key material and never appears in
// a token. Rotating it invalidates the links in mail that was already sent; members
// can still change the setting from their profile.
function signingKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return key && key.length >= 32 ? key : null
}

function sign(userId: string, key: string) {
  return createHmac('sha256', key).update(`${TOKEN_CONTEXT}${userId}`, 'utf8').digest('base64url')
}

/** Token for one member's unsubscribe link, or null when this server cannot sign one. */
export function createUnsubscribeToken(userId: string): string | null {
  const key = signingKey()
  const id = userId.trim().toLowerCase()
  if (!key || !USER_ID.test(id)) return null
  return `${id}.${sign(id, key)}`
}

/** The member id a token was issued for, or null when it is malformed, altered, or signed with another secret. */
export function verifyUnsubscribeToken(token: unknown): string | null {
  const key = signingKey()
  if (!key || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2 || !USER_ID.test(parts[0]) || !SIGNATURE.test(parts[1])) return null
  const expected = Buffer.from(sign(parts[0], key))
  const supplied = Buffer.from(parts[1])
  return supplied.length === expected.length && timingSafeEqual(supplied, expected) ? parts[0] : null
}

/** Unsubscribe link for one member's announcement email, or null when no link can be signed. */
export function announcementUnsubscribeUrl(userId: string | null | undefined, origin?: string): string | null {
  const token = userId ? createUnsubscribeToken(userId) : null
  return token ? `${unsubscribeSiteOrigin(origin)}${UNSUBSCRIBE_PATH}?token=${token}` : null
}
