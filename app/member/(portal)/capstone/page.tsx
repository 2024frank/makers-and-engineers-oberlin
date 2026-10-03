import { requireActiveMember } from '@/lib/auth/memberSession'
import { listCapstoneApplications } from '@/lib/capstone/server'
import { CapstoneApplicationPanel } from '@/components/capstone/CapstoneApplication'
import '@/components/leadership/leadership.css'

export default async function MemberCapstonePage() {
  const member = await requireActiveMember()
  const application = (await listCapstoneApplications()).find(item => item.userId === member.userId)
  return <main className="admin-panel leadership-page">
    <div className="admin-page-heading"><div><h1>Capstone application</h1><p>We plan to work with Career Exploration and Development (CED) to connect students with companies on longer projects shaped by student interests. Tell us what you want to work on and send your resume.</p></div></div>
    <CapstoneApplicationPanel application={application}/>
  </main>
}
