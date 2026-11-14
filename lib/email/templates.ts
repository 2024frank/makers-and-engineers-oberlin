export type TransactionalEmailMessage = {
  subject: string
  text: string
  html?: string
  replyTo?: string
  /** Extra message headers, sent to the mail provider as given. */
  headers?: Record<string, string>
}

export type AdminBroadcastLink = {
  label: string
  url: string
}

export type AdminBroadcastEmailInput = {
  recipientName?: string
  subject: string
  body: string
  eyebrow?: string
  imageUrl?: string | null
  imageAlt?: string
  ctaLabel?: string
  ctaUrl?: string
  links?: AdminBroadcastLink[]
  replyTo?: string
  /** This recipient's unsubscribe link. Leave empty for mail that is not an announcement to a member. */
  unsubscribeUrl?: string | null
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function safeEmailHttpUrl(value?: string | null): string | null {
  if (!value) return null
  try {
    const parsed = new URL(value.trim())
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null
  } catch {
    return null
  }
}

const UNSUBSCRIBE_REASON = 'You are getting this email because you are a member of Makers and Engineers @Oberlin.'
const UNSUBSCRIBE_LABEL = 'Unsubscribe from club announcement email'

/** Headers that let a mail app offer its own unsubscribe button for this link (RFC 8058 one-click). */
export function unsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
}

function unsubscribeTextFooter(unsubscribeUrl: string): string {
  return `${UNSUBSCRIBE_REASON}\n${UNSUBSCRIBE_LABEL}: ${unsubscribeUrl}`
}

/** Marks a plain-text message as announcement mail: a visible unsubscribe line plus the one-click headers. */
export function withUnsubscribe(message: TransactionalEmailMessage, unsubscribeUrl?: string | null): TransactionalEmailMessage {
  const url = safeEmailHttpUrl(unsubscribeUrl)
  if (!url) return message
  return {
    ...message,
    text: `${message.text}\n\n${unsubscribeTextFooter(url)}`,
    headers: { ...message.headers, ...unsubscribeHeaders(url) },
  }
}

function renderHtmlParagraphs(text: string): string {
  const blocks = text
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean)
  if (!blocks.length) return ''
  return blocks
    .map(
      block =>
        `<p style="margin:0 0 14px;color:#1d1f1e;font-size:15px;line-height:1.65;">${escapeHtml(block).replaceAll('\n', '<br />')}</p>`,
    )
    .join('')
}

/** Build a clean responsive HTML and plain-text email for officer-to-member or mass club sends. */
export function renderAdminBroadcastEmail(input: AdminBroadcastEmailInput): TransactionalEmailMessage {
  const subject = input.subject.trim()
  const greeting = hello(input.recipientName ?? '')
  const body = input.body.trim()
  const imageUrl = safeEmailHttpUrl(input.imageUrl)
  const ctaUrl = safeEmailHttpUrl(input.ctaUrl)
  const ctaLabel = input.ctaLabel?.trim()
  const unsubscribeUrl = safeEmailHttpUrl(input.unsubscribeUrl)
  const safeLinks = (input.links ?? [])
    .map(item => ({ label: item.label.trim(), url: safeEmailHttpUrl(item.url) }))
    .filter((item): item is { label: string; url: string } => Boolean(item.label && item.url))

  const textParts = [greeting, '', body]
  if (imageUrl) textParts.push('', `Image: ${imageUrl}`)
  if (ctaLabel && ctaUrl) textParts.push('', `${ctaLabel}: ${ctaUrl}`)
  if (safeLinks.length) {
    textParts.push('', 'Links:', ...safeLinks.map(link => `- ${link.label}: ${link.url}`))
  }
  textParts.push('', 'Makers and Engineers @Oberlin')
  if (unsubscribeUrl) textParts.push('', unsubscribeTextFooter(unsubscribeUrl))

  const eyebrow = input.eyebrow?.trim() || 'Projects for Makers and Engineers @Oberlin'
  const imageBlock = imageUrl
    ? `<div style="margin:0 0 20px;border-radius:12px;overflow:hidden;border:1px solid #e6e4de;"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(input.imageAlt?.trim() || subject)}" style="display:block;width:100%;max-height:360px;object-fit:cover;border:0;" /></div>`
    : ''
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<div style="margin:22px 0;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 22px;background:#a6192e;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;border-radius:999px;">${escapeHtml(ctaLabel)}</a></div>`
      : ''
  const linksBlock = safeLinks.length
    ? `<div style="margin-top:22px;padding-top:16px;border-top:1px solid #ebe9e3;"><p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#666a67;">Shared links</p><ul style="margin:0;padding-left:18px;">${safeLinks.map(link => `<li style="margin:0 0 6px;font-size:14px;"><a href="${escapeHtml(link.url)}" style="color:#a6192e;font-weight:600;text-decoration:underline;">${escapeHtml(link.label)}</a></li>`).join('')}</ul></div>`
    : ''
  const unsubscribeBlock = unsubscribeUrl
    ? `<p style="margin:8px 0 0;">${escapeHtml(UNSUBSCRIBE_REASON)} <a href="${escapeHtml(unsubscribeUrl)}" style="color:#666a67;text-decoration:underline;">${escapeHtml(UNSUBSCRIBE_LABEL)}</a></p>`
    : ''

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px 12px;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;color:#141514;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e3dc;border-radius:16px;overflow:hidden;">
    <div style="padding:18px 26px;background:#141514;color:#fafaf8;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#f3bcc4;">${escapeHtml(eyebrow)}</p>
      <h1 style="margin:6px 0 0;font-size:21px;line-height:1.3;font-weight:700;color:#ffffff;">${escapeHtml(subject)}</h1>
    </div>
    <div style="padding:24px 26px;">
      ${imageBlock}
      <p style="margin:0 0 14px;color:#1d1f1e;font-size:15px;line-height:1.65;">${escapeHtml(greeting)}</p>
      ${renderHtmlParagraphs(body)}
      ${ctaBlock}
      ${linksBlock}
    </div>
    <div style="padding:16px 26px;background:#fafaf8;border-top:1px solid #ebe9e3;font-size:12px;color:#666a67;">
      Projects for Makers and Engineers @Oberlin · Oberlin College${unsubscribeBlock}
    </div>
  </div>
</body>
</html>`

  return {
    subject,
    text: textParts.join('\n'),
    html,
    replyTo: input.replyTo?.trim() || undefined,
    ...(unsubscribeUrl ? { headers: unsubscribeHeaders(unsubscribeUrl) } : {}),
  }
}

const signature='\n\nMakers and Engineers @Oberlin'
const hello=(name:string)=>`Hi ${name.trim()||'there'},`

export function membershipInvitationEmail(input: { displayName: string; verificationUrl: string }): TransactionalEmailMessage {
  return { subject: 'Welcome to Makers and Engineers @Oberlin', text: `${hello(input.displayName)}\n\nYour club membership has been approved. Confirm your Oberlin email, then finish setting up your member account:\n\n${input.verificationUrl}\n\nOnce you finish setup, you can join project teams, submit your own project ideas, and take part in the club. You do not need another officer approval.\n\nIf you were not expecting this invitation, you can ignore it.${signature}` }
}

export function staffInvitationEmail(input:{displayName:string;activationUrl:string;expiresAt:string}):TransactionalEmailMessage{return{subject:'You are invited to the Makers and Engineers @Oberlin staff portal',text:`${hello(input.displayName)}\n\nYou have been invited to help manage the Makers and Engineers @Oberlin website. Use this secure link to activate your officer account and choose a password:\n\n${input.activationUrl}\n\nThis invitation expires ${new Date(input.expiresAt).toLocaleString('en-US',{timeZone:'America/New_York'})}.${signature}`}}
export function membershipVerificationEmail(input:{displayName:string;verificationUrl:string}):TransactionalEmailMessage{return{subject:'Verify your Oberlin email for Makers and Engineers @Oberlin',text:`${hello(input.displayName)}\n\nVerify your @oberlin.edu address to continue your Makers and Engineers @Oberlin membership request:\n\n${input.verificationUrl}\n\nAfter verification, a MEO Admin will review your request. You will not be able to enter the member portal until you are approved.${signature}`}}
export function membershipApprovedEmail(input:{displayName:string;activationUrl:string}):TransactionalEmailMessage{return{subject:'Your member account is approved',text:`${hello(input.displayName)}\n\nYour Makers and Engineers @Oberlin member account has been approved. Use this secure link to activate your account and set a password:\n\n${input.activationUrl}\n\nAfter activation you can save resources and opportunities, apply to projects, propose projects, find teammates, and use project workspaces.${signature}`}}
export function membershipRejectedEmail(input:{displayName:string;reviewNote?:string}):TransactionalEmailMessage{return{subject:'Update on your Makers and Engineers @Oberlin membership request',text:`${hello(input.displayName)}\n\nYour MEO member-account request was not approved at this time.${input.reviewNote?.trim()?`\n\nReview note: ${input.reviewNote.trim()}`:''}\n\nYou can still browse the public MEO website and public resources.${signature}`}}
export function memberMagicLinkEmail(input:{displayName:string;magicUrl:string}):TransactionalEmailMessage{return{subject:'Your MEO member sign-in link',text:`${hello(input.displayName)}\n\nUse this secure link to sign in to your Makers and Engineers @Oberlin member account:\n\n${input.magicUrl}\n\nIf you did not request this link, you can ignore this email.${signature}`}}
export function projectProposalReviewEmail(input:{memberName:string;projectTitle:string;decision:'APPROVED'|'REJECTED';feedback?:string;actionUrl?:string}):TransactionalEmailMessage{const approved=input.decision==='APPROVED';return{subject:approved?'Your MEO project proposal was approved':'Update on your MEO project proposal',text:`${hello(input.memberName)}\n\n${approved?`Your MEO project proposal “${input.projectTitle}” was approved and your team workspace is ready.`:`Your MEO project proposal “${input.projectTitle}” was reviewed and was not approved in its current form.`}${input.feedback?.trim()?`\n\nReview note: ${input.feedback.trim()}`:''}${input.actionUrl?`\n\n${approved?'Open your workspace':'Review your proposal'}: ${input.actionUrl}`:''}${signature}`}}
export function projectTeamInvitationEmail(input:{inviteeName:string;projectTitle:string;inviterName:string;message?:string;actionUrl:string}):TransactionalEmailMessage{return{subject:`Invitation to join ${input.projectTitle}`,text:`${hello(input.inviteeName)}\n\n${input.inviterName} invited you to join the MEO project “${input.projectTitle}”.${input.message?.trim()?`\n\nMessage: ${input.message.trim()}`:''}\n\nReview the invitation and accept or decline it here:\n${input.actionUrl}${signature}`}}
export const projectInvitationEmail=projectTeamInvitationEmail
export function projectApplicationDecisionEmail(input:{memberName:string;projectTitle:string;decision:'ACCEPTED'|'REJECTED';actionUrl:string;note?:string}):TransactionalEmailMessage{const accepted=input.decision==='ACCEPTED';return{subject:accepted?`Your application to ${input.projectTitle} was accepted`:`Update on your application to ${input.projectTitle}`,text:`${hello(input.memberName)}\n\n${accepted?`Your application to “${input.projectTitle}” was accepted. You are now part of the project team.`:`Your application to “${input.projectTitle}” was not accepted at this time.`}${input.note?.trim()?`\n\nProject Lead note: ${input.note.trim()}`:''}\n\n${accepted?'Open your project workspace':'View your applications'}: ${input.actionUrl}${signature}`}}
export function projectUpdateReviewEmail(input:{memberName:string;projectTitle:string;updateTitle:string;decision:'APPROVED_FOR_PUBLISH'|'CHANGES_REQUESTED'|'REJECTED';feedback?:string;actionUrl:string}):TransactionalEmailMessage{const state=input.decision==='APPROVED_FOR_PUBLISH'?'approved to be published':input.decision==='CHANGES_REQUESTED'?'needs changes before it can be published':'was not approved for publishing';return{subject:`Review complete: ${input.updateTitle}`,text:`${hello(input.memberName)}\n\nYour update “${input.updateTitle}” for “${input.projectTitle}” ${state}.${input.feedback?.trim()?`\n\nReview note: ${input.feedback.trim()}`:''}\n\nOpen the project workspace: ${input.actionUrl}${signature}`}}


export function projectTeamWelcomeEmail(input:{memberName:string;projectTitle:string;role:'LEAD'|'MEMBER';actionUrl:string}):TransactionalEmailMessage{const lead=input.role==='LEAD';return{subject:lead?`You are a project lead: ${input.projectTitle}`:`You're on the ${input.projectTitle} team`,text:`${hello(input.memberName)}\n\n${lead?`You are now a lead of the MEO project “${input.projectTitle}”. You can invite teammates, review applications, and plan milestones.`:`You are now on the team for the MEO project “${input.projectTitle}”.`}\n\nIn your project workspace you can see who is on the team, pick up milestones, post progress updates, and share links with your teammates.\n\nOpen your project workspace: ${input.actionUrl}${signature}`}}
export function projectKickoffEmail(input:{memberName:string;projectTitle:string;role:'LEAD'|'MEMBER';message?:string;meetingAt?:string|null;location?:string;actionUrl:string}):TransactionalEmailMessage{const when=input.meetingAt?new Date(input.meetingAt).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'})+' (Eastern)':'';const meeting=when||input.location?.trim()?`\n\nKickoff meeting${when?`\nWhen: ${when}`:''}${input.location?.trim()?`\nWhere: ${input.location.trim()}`:''}`:'';return{subject:`Project kickoff: ${input.projectTitle}`,text:`${hello(input.memberName)}\n\nThe club officers have started the MEO project “${input.projectTitle}”, and you are on the team${input.role==='LEAD'?' as a project lead':''}.${input.message?.trim()?`\n\n${input.message.trim()}`:''}${meeting}\n\nOpen the project workspace to see the plan, claim a milestone, and post your first update:\n${input.actionUrl}${signature}`}}

export function memberPasswordResetEmail(input:{displayName:string;resetUrl:string}):TransactionalEmailMessage{return{subject:'Reset your MEO member password',text:`${hello(input.displayName)}

Use this secure link to choose a new password for your approved Makers and Engineers @Oberlin member account:

${input.resetUrl}

If you did not request a password reset, you can ignore this email.${signature}`}}
export function staffPasswordResetEmail(input:{displayName:string;resetUrl:string}):TransactionalEmailMessage{return{subject:'Reset your MEO officer password',text:`${hello(input.displayName)}

Use this secure link to choose a new password for your active Makers and Engineers @Oberlin officer account:

${input.resetUrl}

If you did not request a password reset, you can ignore this email.${signature}`}}
export function newProjectEmail(input:{memberName:string;projectTitle:string;summary?:string;actionUrl:string;unsubscribeUrl?:string|null}):TransactionalEmailMessage{return withUnsubscribe({subject:`New MEO project: ${input.projectTitle}`,text:`${hello(input.memberName)}

A new project is on the MEO website: “${input.projectTitle}”.${input.summary?.trim()?`

${input.summary.trim()}`:''}

See the project and ask to join the team here:
${input.actionUrl}${signature}`},input.unsubscribeUrl)}
