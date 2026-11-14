const PUBLIC_ORIGIN = 'https://makeoberlin.site'
const OFFICER_HOSTS = ['admin.makeoberlin.site', 'admin.oberlin32engineeringsociety.com']

// Links in member email must open the public site, never a blank or officer host.
export function memberSiteOrigin(configured = process.env.NEXT_PUBLIC_SITE_URL) {
  try {
    if (!configured?.trim()) return PUBLIC_ORIGIN
    const url = new URL(configured.trim())
    if (!['https:', 'http:'].includes(url.protocol) || OFFICER_HOSTS.includes(url.hostname)) return PUBLIC_ORIGIN
    return url.origin
  } catch { return PUBLIC_ORIGIN }
}

// The bare domain answers every request with a 308 to www. A browser follows that, but
// a mail provider's one-click unsubscribe is a POST that must not be redirected (RFC
// 8058, section 3.1). Unsubscribe links therefore name the host that serves the site
// directly. Update this if the redirect between the two hosts is ever reversed.
const SERVED_FROM: Record<string, string> = { [PUBLIC_ORIGIN]: 'https://www.makeoberlin.site' }

export function unsubscribeSiteOrigin(configured = process.env.NEXT_PUBLIC_SITE_URL) {
  const origin = memberSiteOrigin(configured)
  return SERVED_FROM[origin] ?? origin
}
