import { redirect } from 'next/navigation'
import '@/components/projects/project-teams.css'
import { ContentManager } from '@/components/admin/content/ContentManager'
import { listAdminContent } from '@/lib/cms/adminContent'
import { listMedia } from '@/lib/cms/media'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { ProjectRosterPerson } from '@/components/admin/projects/ProjectTeamPreview'

// Active roster per project: shown on each row, and its size lets the delete confirmation
// warn when people are on the team. A failed lookup only hides them; the page still works.
async function teamRosters(){const rosters:Record<string,ProjectRosterPerson[]>={};try{const db=createSupabaseAdminClient();const {data:memberships}=await db.from('project_memberships').select('project_id,user_id,role').eq('status','ACTIVE');const ids=[...new Set((memberships??[]).map(row=>row.user_id))];const {data:profiles}=ids.length?await db.from('member_profiles').select('user_id,display_name,oberlin_email').in('user_id',ids):{data:[]};const names=new Map((profiles??[]).map(profile=>[profile.user_id,profile.display_name||profile.oberlin_email]));for(const row of memberships??[])(rosters[row.project_id]??=[]).push({displayName:names.get(row.user_id)||'Member',role:row.role==='LEAD'?'LEAD':'MEMBER'});for(const list of Object.values(rosters))list.sort((a,b)=>a.role===b.role?a.displayName.localeCompare(b.displayName):a.role==='LEAD'?-1:1)}catch{}return rosters}
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;const admin=await requireAdmin();if(typeof params.edit==='string'&&admin.role!=='EDITOR'&&/^[0-9a-f-]{36}$/i.test(params.edit))redirect(`/admin/projects/${params.edit}?tab=edit`);const [rows,mediaAssets,rosters]=await Promise.all([listAdminContent('projects'),listMedia(),teamRosters()]);const sizes=Object.fromEntries(Object.entries(rosters).map(([id,people])=>[id,people.length]));const canPublish=can(admin.role,'PUBLISH_CONTENT',admin.scopes,'projects')||(admin.role==='EDITOR'&&admin.canPublish&&admin.scopes.includes('projects'));return <ContentManager entityType="projects" title="Projects" rows={rows} mediaAssets={mediaAssets} canPublish={canPublish} canDelete={admin.role!=='EDITOR'} teamSizes={sizes} teamRosters={rosters} initialCreate={params.new==='1'} initialEditId={typeof params.edit==='string'?params.edit:undefined}/>}
