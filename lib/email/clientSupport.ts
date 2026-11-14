export function clubReplyTo() {
  return process.env.CLUB_REPLY_TO?.trim() || 'makers.engineers@oberlin.edu'
}
