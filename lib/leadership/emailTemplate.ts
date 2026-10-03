import type { TransactionalEmailMessage } from '@/lib/email/templates'
export function officerOpeningEmail(input: { displayName: string; roleTitle: string; term: string; bio: string; closesAt: string | null; positionId: string }): TransactionalEmailMessage {
  const deadline = input.closesAt ? `\n\nApply by ${new Date(input.closesAt).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'long', timeStyle: 'short' })} Eastern time.` : ''
  return {
    subject: `MOE is looking for a ${input.roleTitle}`,
    text: `Hi ${input.displayName.trim() || 'there'},\n\nWe have an opening for ${input.roleTitle}${input.term ? ` (${input.term})` : ''}.\n\n${input.bio.trim()}${deadline}\n\nRead the details and apply through your member account:\nhttps://makeoberlin.site/leadership#position-${input.positionId}\n\nQuestions? Contact the club officers.\n\nMakers and Engineers @Oberlin`,
  }
}
