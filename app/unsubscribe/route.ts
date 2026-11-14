import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { UNSUBSCRIBE_PATH, verifyUnsubscribeToken } from '@/lib/email/unsubscribe'

// The address behind the unsubscribe link in club announcement email.
//   GET  shows a confirm page and changes nothing, because mail scanners open links on
//        their own.
//   POST turns announcement email off. Mail apps send it from their own unsubscribe
//        button (RFC 8058 one-click), and the confirm page's button sends the same request.
// The signed token in the link is the only credential: no login, no cookie. It can turn
// announcement email off but not back on; that takes a signed-in member.
export const dynamic = 'force-dynamic'

const PAGE_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
  // The token is in the address, so never pass the address on to another site.
  'referrer-policy': 'no-referrer',
}

const STYLES = `
  body{margin:0;padding:32px 16px;background:#f5f4f0;color:#141514;font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif}
  main{max-width:520px;margin:0 auto;padding:28px;background:#fff;border:1px solid #e5e3dc;border-radius:16px}
  .club{margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#a6192e}
  h1{margin:0 0 12px;font-size:24px;line-height:1.25}
  p{margin:0 0 14px}
  form{margin:20px 0 0}
  button{font:inherit;font-weight:600;padding:12px 22px;border:0;border-radius:999px;background:#a6192e;color:#fff;cursor:pointer}
  a{color:#a6192e}
  button:focus-visible,a:focus-visible{outline:3px solid #141514;outline-offset:3px}
  .quiet{margin:18px 0 0;font-size:14px;color:#555a57}
`

function page(status: number, title: string, body: string) {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title} · Makers and Engineers @Oberlin</title>
<style>${STYLES}</style>
</head>
<body>
<main>
<p class="club">Makers and Engineers @Oberlin</p>
${body}
</main>
</body>
</html>`,
    { status, headers: PAGE_HEADERS },
  )
}

// A verified token contains only letters, digits, hyphens, underscores and one dot, so it
// is safe inside the form address.
const confirmForm = (token: string, label: string) =>
  `<form method="post" action="${UNSUBSCRIBE_PATH}?token=${token}"><button type="submit">${label}</button></form>`

const profileLink = '<a href="/member/profile">My profile</a>'

function confirmPage(token: string) {
  return page(
    200,
    'Turn off club announcement email?',
    `<h1>Turn off club announcement email?</h1>
<p>You will stop getting announcements from club officers, new project notices, and officer opening notices by email.</p>
<p>You will still get email about your own account, such as sign-in links and decisions on your applications. Announcements stay in your member portal.</p>
${confirmForm(token, 'Turn off announcement email')}
<p class="quiet">If you want to keep getting them, close this page. Nothing changes until you press the button.</p>`,
  )
}

function donePage() {
  return page(
    200,
    'Announcement email is off',
    `<h1>Announcement email is off</h1>
<p>You will not get club announcements, new project notices, or officer opening notices by email.</p>
<p>You will still get email about your own account, and an officer can still write to you directly.</p>
<p class="quiet">To turn announcement email back on, sign in and open ${profileLink}.</p>`,
  )
}

function invalidPage(status: number) {
  return page(
    status,
    'This unsubscribe link does not work',
    `<h1>This unsubscribe link does not work</h1>
<p>The link is incomplete or out of date, so nothing was changed.</p>
<p>To change your email settings, sign in and open ${profileLink}. You can also reply to any club email and an officer will help.</p>`,
  )
}

function failedPage(token: string) {
  return page(
    500,
    'We could not save that',
    `<h1>We could not save that</h1>
<p>Something went wrong on our side and your setting did not change. Please try again.</p>
${confirmForm(token, 'Try again')}
<p class="quiet">You can also sign in and change this in ${profileLink}.</p>`,
  )
}

const tokenFrom = (request: Request) => new URL(request.url).searchParams.get('token') ?? ''

// Mail apps mark a request from their own unsubscribe button with this form field.
async function requestSource(request: Request) {
  try {
    return (await request.formData()).get('List-Unsubscribe') === 'One-Click' ? 'one_click' : 'email_link'
  } catch {
    return 'email_link'
  }
}

export async function GET(request: Request) {
  const token = tokenFrom(request)
  return verifyUnsubscribeToken(token) ? confirmPage(token) : invalidPage(400)
}

export async function POST(request: Request) {
  const token = tokenFrom(request)
  const userId = verifyUnsubscribeToken(token)
  if (!userId) return invalidPage(400)

  try {
    const { data, error } = await createSupabaseAdminClient().rpc('set_member_announcement_email_opt_out', {
      p_user_id: userId,
      p_opt_out: true,
      p_source: await requestSource(request),
    })
    if (error) throw new Error(error.message)
    // False means the member profile behind this link no longer exists.
    if (data !== true) return invalidPage(404)
  } catch (error) {
    console.error('ANNOUNCEMENT_UNSUBSCRIBE_FAILED', error instanceof Error ? error.message : '')
    return failedPage(token)
  }
  return donePage()
}
