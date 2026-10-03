import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { NextMeeting } from "@/components/public/NextMeeting";
import { homeIntroduction } from "@/lib/content/publicCopy";
import type { z } from "zod";
import type { heroSchema } from "@/lib/page-builder/schemas/hero";
import type { PageRenderContext } from "@/lib/page-builder/types";
export function HeroSection({
  section,
  context,
}: {
  section: z.infer<typeof heroSchema>;
  context?: PageRenderContext;
}) {
  const media = section.imageId ? context?.media?.[section.imageId] : undefined;
  const home = context?.pageSlug === "home";
  if (home) {
    // Preserve officer-selected media and new copy; only retire the original seed headline.
    const image = media?.url ?? "https://qaudokydctziaoakvkyv.supabase.co/storage/v1/object/public/oec-media/site/home-hero-workbench.jpg";
    const defaultHeadline = ["Build things. Learn together.", "Student engineering projects at Oberlin College.", "Makers and Engineers @Oberlin", "Makers and Engineers @Oberlin."].includes(section.headline);
    return <>
      <section className="club-opening" aria-label="Makers and Engineers at Oberlin">
        <div className="shell club-opening__grid">
          <div className="club-opening__copy">
            <p className="eyebrow">A student club at Oberlin College</p>
            <h1>{defaultHeadline ? <><span>Makers and Engineers</span><small>@Oberlin<span aria-hidden="true">.</span></small></> : section.headline}</h1>
            <p className="club-opening__intro">{section.body || homeIntroduction}</p>
            <div className="button-row">
              <Link className="button button--primary" href="/projects">Explore projects <ArrowRight size={18} aria-hidden="true"/></Link>
              <Link className="button button--secondary" href="/get-involved">Join the club</Link>
            </div>
            <p className="club-opening__welcome">Every major. Every experience level.</p>
          </div>
          <figure className="club-opening__media">
            <div className="club-opening__photograph"><Image src={image} alt={section.imageAlt || media?.alt || "Students at a workshop bench with electronics and tools"} fill preload sizes="(max-width: 800px) 100vw, 50vw"/></div>
            <figcaption><span>Hands-on work. Shared curiosity.</span><Link href="/about">Meet the club <ArrowUpRight size={17} aria-hidden="true"/></Link></figcaption>
          </figure>
        </div>
        <nav className="shell club-opening__paths" aria-label="Get started">
          <Link href="/events"><span>Come along</span><strong>See club events</strong><ArrowUpRight size={22} aria-hidden="true"/></Link>
          <Link href="/get-involved?type=propose_project"><span>Bring an idea</span><strong>Share a project idea</strong><ArrowUpRight size={22} aria-hidden="true"/></Link>
          <Link href="/member/login"><span>Already a member?</span><strong>Member sign in</strong><ArrowUpRight size={22} aria-hidden="true"/></Link>
        </nav>
      </section>
      <NextMeeting events={context?.events ?? []}/>
      <section className="home-statement" aria-label="About the club">
        <div className="shell">
          <p className="home-statement__lead">Different majors.<br/><span>A shared place to learn and build.</span></p>
          <div className="home-statement__aside">
            <p>Workshops, student and alumni talks, team projects, and a community to explore engineering with. Every major is welcome, with no experience or 3-2 participation required.</p>
            <Link className="text-link" href="/about">About the club <ArrowUpRight size={17} aria-hidden="true"/></Link>
          </div>
        </div>
      </section>
    </>;
  }
  const image = media?.url;
  return (
    <>
      <section className={image ? "home-hero" : "editorial-hero"}>
        {image && (
          <Image
            className="home-hero__image"
            src={image}
            alt={section.imageAlt || media?.alt || ""}
            fill
            priority
            sizes="100vw"
          />
        )}
        <div className="shell">
          <div className="hero-copy">
            {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
            <h1>{section.headline}</h1>
            <p>{section.body}</p>
            <div className="button-row">
              {section.primaryCta && (
                <Link
                  className="button button--primary"
                  href={section.primaryCta.href}
                >
                  {section.primaryCta.label}
                  <ArrowRight size={18} />
                </Link>
              )}
              {section.secondaryCta && (
                <Link
                  className="hero-secondary"
                  href={section.secondaryCta.href}
                >
                  {section.secondaryCta.label}
                  <ArrowRight size={17} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
