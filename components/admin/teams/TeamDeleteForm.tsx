'use client'
import { useRouter } from 'next/navigation'
import { DeleteConfirm } from '@/components/admin/DeleteConfirm'

// Permanent delete of a club team from its admin page. The officer types the team name first.
export function TeamDeleteForm({ teamId, name, members }: { teamId: string; name: string; members: number }) {
  const router = useRouter()
  async function remove(typed: string): Promise<string | null> {
    const response = await fetch('/api/admin/teams', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ teamId, confirmName: typed }) })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) return typeof body.error === 'string' && body.error ? body.error : 'Could not delete this team. Nothing was removed; refresh and try again.'
    router.push('/admin/teams'); router.refresh()
    return null
  }
  return <section className="project-delete portal-shell" aria-label="Delete team">
    <DeleteConfirm requireTyped label="Delete team" itemName={name} consequence={`This removes the team, its roster, join requests and links to projects.${members > 0 ? ` ${members} ${members === 1 ? 'member is' : 'members are'} on it and will be notified.` : ''}`} onConfirm={remove}/>
  </section>
}
