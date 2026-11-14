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
        name: 'Projects for Makers and Engineers',
        alternateName: 'Projects for Makers and Engineers @Oberlin',
        url: base,
        email: contactEmail,
        logo: { '@type': 'ImageObject', url: `${base}/brand/moe-badge-circle.png` },
        description: 'Projects for Makers and Engineers at Oberlin College. Build interdisciplinary engineering projects, attend workshops, and explore the 3-2 pathway.',
        ...(sameAs.length ? { sameAs } : {}),
        memberOf: { '@type': 'CollegeOrUniversity', name: 'Oberlin College', url: 'https://www.oberlin.edu' }
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: 'Projects for Makers and Engineers',
        publisher: { '@id': `${base}/#organization` },
        inLanguage: 'en-US'
      }
    ]
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}
