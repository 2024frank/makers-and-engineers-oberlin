const SESSION_EXPIRED_MESSAGE = 'Your officer session has expired. Reload the page, sign in again, and resend.'

// Friendly text for error codes the admin email route returns. Codes not listed here are
// shown as they are.
export const SEND_ERRORS: Record<string, string> = {
  SESSION_EXPIRED: SESSION_EXPIRED_MESSAGE,
  FORBIDDEN: 'Your officer role cannot send club email. Ask an Admin or Super Admin to send it.',
}

// The send route always answers in JSON. Anything else (the login page after a redirect, or
// a platform error page after a timeout) means the request never reached the email code, and
// used to surface as a bare "Email send failed.".
export function describeSendFailure(response: Pick<Response, 'status' | 'redirected'>, result: { error?: unknown }) {
  const code = typeof result.error === 'string' ? result.error : ''
  if (code) return SEND_ERRORS[code] ?? code
  if (response.status === 401 || response.redirected) return SESSION_EXPIRED_MESSAGE
  if (response.status === 504) {
    return 'The server took too long to answer. Check Recent sends before sending again, so nobody gets it twice.'
  }
  return `Email send failed (HTTP ${response.status}). Reload the page and try again.`
}
