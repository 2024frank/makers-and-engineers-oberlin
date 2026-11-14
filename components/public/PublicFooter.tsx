import Link from 'next/link'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { publicCopy } from '@/lib/content/publicCopy'

const socialLabels: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  youtube: 'YouTube',
}

function formatSocialLabel(label: string) {
  const key = label.trim().toLowerCase()
  return socialLabels[key] ?? `${label.charAt(0).toUpperCase()}${label.slice(1)}`
}

export function PublicFooter({
  contactEmail = 'makers.engineers@oberlin.edu',
  footerText = 'Student engineering projects at Oberlin College.',
  socialLinks = {},
  badgeSrc,
}: {
  contactEmail?: string
  footerText?: string
  socialLinks?: Record<string, string>
  badgeSrc?: string | null
}) {
  const cleanFooterText = publicCopy(footerText)
  const officerSignIn = (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- This route redirects to the separate officer origin.
    <a href="/admin/login">Officer sign in</a>
  )

  return (
    <footer className="public-footer">
      <div className="shell">
        <div className="footer-top">
          <div>
            <BrandLogo variant="badge" src={badgeSrc} />
            <h2>
              Projects for Makers
              <br />
              and Engineers
            </h2>
            <p>{cleanFooterText}</p>
          </div>
          <div className="footer-links">
            <h3>Explore</h3>
            <Link href="/projects">Projects</Link>
            <Link href="/events">Events</Link>
            <Link href="/pathway">3-2 pathway</Link>
            <Link href="/about">About the club</Link>
          </div>
          <div className="footer-links">
            <h3>Resources</h3>
            <Link href="/resources">Resources</Link>
            <Link href="/opportunities">Opportunities</Link>
            <Link href="/capstone">Capstone projects</Link>
            <Link href="/news">News</Link>
            <Link href="/member/login">Member sign in</Link>
            <Link href="/app">Get the app</Link>
          </div>
          <div className="footer-links">
            <h3>Connect</h3>
            <a href={`mailto:${contactEmail}`}>
              Contact the club
            </a>
            {Object.entries(socialLinks)
              .filter(([, url]) => url)
              .map(([label, url]) => (
                <a href={url} key={label} target="_blank" rel="noreferrer">
                  {formatSocialLabel(label)}
                </a>
              ))}
            <Link href="/get-involved">
              Join the club
            </Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>A student organization at Oberlin College</span>
          <span>Oberlin, Ohio</span>
          <Link href="/privacy">Privacy</Link>
          {officerSignIn}
        </div>
        <p className="footer-wordmark" aria-hidden="true">
          Projects for Makers and Engineers
        </p>
      </div>
    </footer>
  )
}
