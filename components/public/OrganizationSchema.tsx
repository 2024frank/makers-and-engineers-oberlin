import 'server-only'

// JSON-LD so search engines can identify the club as an entity rather than inferring it
// from page text: name, canonical URL, logo, contact address and linked social profiles.
export function OrganizationSchema({ siteUrl, contactEmail, socialLinks }: { siteUrl: string; contactEmail: string; socialLinks: Record<string, string> }) {
  const base = siteUrl.replace(/\/$/, '')
  const sameAs = Object.values(socialLinks).filter(Boolean)

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: 'Makers and Engineers @Oberlin',
        alternateName: 'MOE',
        url: base,
        email: contactEmail,
        logo: { '@type': 'ImageObject', url: `${base}/brand/moe-badge-circle.png` },
        description: 'A student engineering club at Oberlin College. Projects, events, and information about the 3-2 pathway.',
        ...(sameAs.length ? { sameAs } : {}),
        memberOf: { '@type': 'CollegeOrUniversity', name: 'Oberlin College', url: 'https://www.oberlin.edu' }
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: 'Makers and Engineers @Oberlin',
        publisher: { '@id': `${base}/#organization` },
        inLanguage: 'en-US'
      }
    ]
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}
