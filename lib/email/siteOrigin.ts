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
