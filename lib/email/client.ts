import { clubReplyTo } from './clientSupport'
import type { TransactionalEmailMessage } from './templates'

export { clubReplyTo }

const BATCH_CHUNK_SIZE = 100

function resendConfig(required: boolean) {
  const key = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!key || !from) {
    if (required) throw new Error('EMAIL_CONFIG_MISSING')
    return null
  }
  return { key, from }
}

function buildPayload(from: string, to: string, message: TransactionalEmailMessage) {
  const headers = message.headers && Object.keys(message.headers).length > 0 ? message.headers : null
  return {
    from,
    reply_to: message.replyTo?.trim() || clubReplyTo(),
    to: [to.trim().toLowerCase()],
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
    // Resend adds these to the outgoing message, for example List-Unsubscribe.
    ...(headers ? { headers } : {}),
  }
}

export async function sendTransactionalEmail(input: {
  to: string
  message: TransactionalEmailMessage
  required?: boolean
}) {
  const required = input.required !== false
  const config = resendConfig(required)
  if (!config) return false

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(buildPayload(config.from, input.to, input.message)),
  })

  if (!response.ok) {
    if (required) throw new Error(`EMAIL_SEND_FAILED:${response.status}`)
    return false
  }
  return true
}

export async function sendTransactionalEmailBatch(input: {
  messages: Array<{ to: string; message: TransactionalEmailMessage }>
  idempotencyKey?: string
  required?: boolean
}): Promise<number> {
  if (input.messages.length === 0) return 0
  const required = Boolean(input.required)
  const config = resendConfig(required)
  if (!config) return 0

  let delivered = 0
  for (let offset = 0; offset < input.messages.length; offset += BATCH_CHUNK_SIZE) {
    const chunk = input.messages.slice(offset, offset + BATCH_CHUNK_SIZE)
    const headers: Record<string, string> = {
      authorization: `Bearer ${config.key}`,
      'content-type': 'application/json',
    }
    if (input.idempotencyKey) {
      headers['Idempotency-Key'] = `${input.idempotencyKey}/${Math.floor(offset / BATCH_CHUNK_SIZE)}`
    }

    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk.map(item => buildPayload(config.from, item.to, item.message))),
    })

    if (!response.ok) {
      if (required) throw new Error(`EMAIL_BATCH_SEND_FAILED:${response.status}`)
      continue
    }
    delivered += chunk.length
  }

  return delivered
}
