import Link from 'next/link'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { LiveStudioCanvas } from '@/components/public/LiveStudioCanvas'
import { MemberLoginPanel } from '@/components/member/MemberLoginPanel'
export default async function MemberLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  return (
    <main className="studio-auth">
      <div className="studio-auth__frame">
        <aside className="studio-auth__aside">
          <LiveStudioCanvas variant="subtle" />
          <div>
            <Link href="/" aria-label="Projects for Makers and Engineers home">
              <BrandLogo variant="badge" />
            </Link>
            <h1>Member portal</h1>
            <p>Project teams, applications, and saved resources.</p>
            <ul className="studio-auth__aside-specs">
              <li>Browse active project teams &amp; openings</li>
              <li>Submit ideas, capstone interests &amp; officer apps</li>
              <li>Track invitations, updates, and club resources</li>
            </ul>
          </div>
          <Link className="studio-auth__back" href="/">
            Back to the club website
          </Link>
        </aside>
        <MemberLoginPanel
          next={typeof params.next === 'string' ? params.next : undefined}
          authError={typeof params.error === 'string' ? params.error : undefined}
          status={typeof params.status === 'string' ? params.status : undefined}
        />
      </div>
    </main>
  )
}
