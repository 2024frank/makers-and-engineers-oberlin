import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import type { z } from 'zod'
import type { heroSchema } from '@/lib/page-builder/schemas/hero'
import type { PageRenderContext } from '@/lib/page-builder/types'
import { LiveStudioCanvas } from '@/components/public/LiveStudioCanvas'
import { NextMeeting } from '@/components/public/NextMeeting'
import { retireCopy } from '@/lib/content/publicCopy'

const DEFAULT_HOME_IMAGE = '/brand/project-led/oberlin-workshop-4k.webp'
const DEFAULT_HOME_IMAGE_ALT =
  'Oberlin students and mentor discussing hardware builds in the makerspace studio'
const RETIRED_HOME_IMAGE_PATHS = [
  '/home-workshop-wide.jpg',
  '/brand/project-led/hardware-hero.webp',
  '/site/home-hero-workbench.jpg',
  '/home-hero-workbench.jpg',
]

/** Treat legacy placeholder/stock workbench hero URLs as retired so curated studio photography renders instead. */
function isRetiredHomeImage(url?: string | null): boolean {
  if (!url) return false
  try {
    const pathname = new URL(url, 'https://makeoberlin.site').pathname
    return RETIRED_HOME_IMAGE_PATHS.some(retired => pathname.endsWith(retired))
  } catch {
    return RETIRED_HOME_IMAGE_PATHS.some(retired => url.includes(retired))
  }
}

export function HeroSection({
  section,
  context,
}: {
  section: z.infer<typeof heroSchema>
  context?: PageRenderContext
}) {
  const isHome = context?.pageSlug === 'home'
  const media = section.imageId ? context?.media?.[section.imageId] : undefined
  const rawHeadline = retireCopy(section.headline)
  const headlineText =
    isHome && rawHeadline === 'Student engineering projects at Oberlin College.'
      ? 'Projects for Makers and Engineers.'
      : rawHeadline
  const bodyText = retireCopy(section.body)
  const eyebrowText = section.eyebrow ? retireCopy(section.eyebrow) : undefined

  if (isHome) {
    const useCustomMedia = Boolean(media?.url && !isRetiredHomeImage(media.url))
    const heroPhotoUrl = useCustomMedia && media ? media.url : DEFAULT_HOME_IMAGE
    const heroPhotoAlt = useCustomMedia
      ? section.imageAlt || media?.alt || DEFAULT_HOME_IMAGE_ALT
      : DEFAULT_HOME_IMAGE_ALT

    return (
      <section className="club-opening" aria-label="Projects for Makers and Engineers">
        <LiveStudioCanvas />
        <div className="shell club-opening__inner">
          <div className="club-opening__intro">
            <p className="club-opening__eyebrow">
              {eyebrowText || 'Oberlin College'}
            </p>
            <h1>{headlineText}</h1>
            <p className="club-opening__lead">{bodyText}</p>
            <nav className="club-opening__actions" aria-label="Get started">
              <Link className="button button--primary" href="/get-involved">
                Join the club
              </Link>
              <Link className="button button--secondary" href="/projects">
                Explore projects
              </Link>
              <Link className="text-link" href="/events">
                See club events
              </Link>
            </nav>
            <NextMeeting events={context?.events ?? []} />
          </div>
          <div className="club-opening__media">
            <Image
              src={heroPhotoUrl}
              alt={heroPhotoAlt}
              width={3840}
              height={2880}
              quality={92}
              sizes="(max-width: 980px) 100vw, 50vw"
              priority
            />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={media ? 'home-hero' : 'directory-hero'}>
      <div className={media ? 'shell home-hero__grid' : 'shell'}>
        <div>
          {eyebrowText && <p className="eyebrow">{eyebrowText}</p>}
          <h1>{headlineText}</h1>
          <p>{bodyText}</p>
          {(section.primaryCta || section.secondaryCta) && (
            <div className="button-row">
              {section.primaryCta && (
                <Link className="button button--primary" href={section.primaryCta.href}>
                  {section.primaryCta.label} <ArrowRight size={17} aria-hidden="true" />
                </Link>
              )}
              {section.secondaryCta && (
                <Link className="button button--secondary" href={section.secondaryCta.href}>
                  {section.secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>
        {media && (
          <div className="home-hero__media">
            <Image
              src={media.url}
              alt={section.imageAlt || media.alt || headlineText}
              width={1200}
              height={900}
              sizes="(max-width: 980px) 100vw, 45vw"
              priority
            />
          </div>
        )}
      </div>
    </section>
  )
}
