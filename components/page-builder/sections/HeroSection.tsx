import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import type { z } from 'zod'
import type { heroSchema } from '@/lib/page-builder/schemas/hero'
import type { PageRenderContext } from '@/lib/page-builder/types'
import { NextMeeting } from '@/components/public/NextMeeting'
import { retireCopy } from '@/lib/content/publicCopy'

const DEFAULT_HOME_IMAGE =
  'https://qaudokydctziaoakvkyv.supabase.co/storage/v1/object/public/oec-media/site/home-workshop-wide.jpg'

export function HeroSection({
  section,
  context,
}: {
  section: z.infer<typeof heroSchema>
  context?: PageRenderContext
}) {
  const isHome = context?.pageSlug === 'home'
  const media = section.imageId ? context?.media?.[section.imageId] : undefined
  const headlineText = retireCopy(section.headline)
  const bodyText = retireCopy(section.body)
  const eyebrowText = section.eyebrow ? retireCopy(section.eyebrow) : undefined

  if (isHome) {
    const heroPhotoUrl = media?.url ?? DEFAULT_HOME_IMAGE
    const heroPhotoAlt =
      section.imageAlt ||
      media?.alt ||
      'Oberlin students collaborating on a fabrication build at the workshop bench'

    return (
      <section className="club-opening" aria-label="Makers and Engineers at Oberlin">
        <div className="shell club-opening__inner">
          <div className="club-opening__intro">
            <span className="club-opening__badge">
              {eyebrowText || 'Makers and Engineers @Oberlin'}
            </span>
            <h1>{headlineText}</h1>
            <p className="club-opening__lead">{bodyText}</p>
            <nav className="club-opening__actions" aria-label="Get started">
              <Link className="button button--primary" href="/get-involved">
                Join the club <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="button button--secondary" href="/projects">
                Explore projects
              </Link>
              <Link className="text-link" href="/events">
                See club events <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </nav>
            <NextMeeting events={context?.events ?? []} />
          </div>
          <div className="club-opening__media">
            <Image
              src={heroPhotoUrl}
              alt={heroPhotoAlt}
              width={1200}
              height={900}
              sizes="(max-width: 980px) 100vw, 44vw"
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
