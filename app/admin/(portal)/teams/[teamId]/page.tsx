import { redirect } from 'next/navigation'

// Club teams were folded into Projects: each project is its team, managed from its page.
export default function AdminTeamPage(): never {
  redirect('/admin/projects')
}
