// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Users: 1 admin (not a member); members 10 and 11 active, 12 suspended. Position 20. Project 30.
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
let db: PGlite
const asUser = (n: number | null) => db.query("select set_config('request.jwt.claim.sub',$1,false)", [n === null ? '' : id(n)])
const optedOut = async () => (await db.query<{ user_id: string }>(
  'select user_id from public.member_profiles where announcement_email_opt_out order by user_id')).rows.map(row => row.user_id)
const setMine = async (optOut: boolean) => (await db.query<{ ok: boolean }>('select public.set_my_announcement_email_opt_out($1) ok', [optOut])).rows[0].ok
const setFor = async (user: number, optOut: boolean) => (await db.query<{ ok: boolean }>(
  'select public.set_member_announcement_email_opt_out($1,$2) ok', [id(user), optOut])).rows[0].ok
const audit = async () => (await db.query<{ actor_id: string; action: string; after_snapshot: Record<string, unknown> }>(
  "select actor_id,action,after_snapshot from public.audit_log where action like 'ANNOUNCEMENT_EMAIL_%' order by created_at,action")).rows
const can = async (role: string, fn: string) => (await db.query<{ ok: boolean }>("select has_function_privilege($1,$2,'execute') ok", [role, fn])).rows[0].ok
const outbox = async () => (await db.query<{ recipient: string; status: string }>(
  'select recipient,status from public.officer_email_outbox order by recipient')).rows
// Publishing an opening is an officer action; the trigger checks the publisher's role.
async function publishOpening() {
  await asUser(1)
  await db.query("update public.leaders set publication_state='published',open_seat=true where id=$1", [id(20)])
}
// Postgres aborts a transaction after an error, so expected failures run inside a savepoint.
async function rejects(sql: string, params: unknown[], code: string) {
  await db.exec('savepoint expected_failure')
  await expect(db.query(sql, params)).rejects.toThrow(code)
  await db.exec('rollback to savepoint expected_failure')
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select 'authenticated'::text $$;`)
  for (const name of ['001_core', '002_content', '003_cms', '004_rls', '010_staff_invites', '011_members', '012_project_collaboration', '013_member_staff_rls',
    '019_project_difficulty', '025_officer_openings', '028_project_announcements', '049_announcement_email_opt_out']) {
    await db.exec(readFileSync(`database/migrations/${name}.sql`, 'utf8'))
  }
  // Supabase grants table access to signed-in users and leaves the decision to row-level security.
  await db.exec('grant usage on schema public,private,auth to authenticated;grant select,update on public.member_profiles,public.leaders to authenticated')
}, 30000)
beforeEach(async () => {
  await db.exec('begin')
  for (const n of [1, 10, 11, 12]) await db.query('insert into auth.users values($1,$2)', [id(n), `m${n}@oberlin.edu`])
  await db.query("insert into public.admin_profiles(user_id,status,active) values($1,'ACTIVE',true)", [id(1)])
  await db.query("insert into public.role_assignments(user_id,role,scopes,can_publish) values($1,'ADMIN',array['leaders'],true)", [id(1)])
  for (const n of [10, 11, 12]) {
    await db.query("insert into public.membership_requests(id,email,display_name,status,auth_user_id) values($1,$2,$3,'ACTIVE',$1)", [id(n), `m${n}@oberlin.edu`, `Member ${n}`])
    await db.query('insert into public.member_profiles(user_id,membership_request_id,oberlin_email,display_name,status) values($1,$1,$2,$3,$4)',
      [id(n), `m${n}@oberlin.edu`, `Member ${n}`, n === 12 ? 'SUSPENDED' : 'ACTIVE'])
  }
  await db.query("insert into public.leaders(id,name,role_title) values($1,'Open position','Secretary')", [id(20)])
  await db.query("insert into public.projects(id,slug,title,summary,publication_state) values($1,'solar-cart','Solar Cart','Build a solar charging cart.','published')", [id(30)])
  await asUser(10)
})
afterEach(async () => { await db.exec('rollback') })
afterAll(async () => { await db?.close() })

describe('the member setting', () => {
  it('starts every member opted in', async () => {
    expect(await optedOut()).toEqual([])
  })

  it('lets an active member turn announcement email off and back on, recording each real change once', async () => {
    expect(await setMine(true)).toBe(true)
    expect(await optedOut()).toEqual([id(10)])
    expect(await setMine(true)).toBe(true)
    expect(await audit()).toEqual([
      { actor_id: id(10), action: 'ANNOUNCEMENT_EMAIL_OPT_OUT', after_snapshot: { announcementEmailOptOut: true, source: 'member_settings' } },
    ])
    expect(await setMine(false)).toBe(true)
    expect(await optedOut()).toEqual([])
    expect((await audit()).map(row => row.action).sort()).toEqual(['ANNOUNCEMENT_EMAIL_OPT_IN', 'ANNOUNCEMENT_EMAIL_OPT_OUT'])
  })

  it.each([null, 1, 12])('refuses the portal setting without an active member session (%s)', async user => {
    await asUser(user)
    await rejects('select public.set_my_announcement_email_opt_out($1)', [true], 'ACTIVE_MEMBER_REQUIRED')
    expect(await optedOut()).toEqual([])
  })

  it('opts out from the email link without a session, whatever the member status', async () => {
    await asUser(null)
    await db.exec('set local role service_role')
    expect(await setFor(12, true)).toBe(true)
    expect(await setFor(99, true)).toBe(false)
    await db.exec('reset role')
    expect(await optedOut()).toEqual([id(12)])
    expect(await audit()).toEqual([
      { actor_id: id(12), action: 'ANNOUNCEMENT_EMAIL_OPT_OUT', after_snapshot: { announcementEmailOptOut: true, source: 'email_link' } },
    ])
  })

  it('keeps the link function server-only and the portal function for signed-in users', async () => {
    const link = 'public.set_member_announcement_email_opt_out(uuid,boolean,text)'
    const mine = 'public.set_my_announcement_email_opt_out(boolean)'
    expect([await can('anon', link), await can('authenticated', link), await can('service_role', link)]).toEqual([false, false, true])
    expect([await can('anon', mine), await can('authenticated', mine)]).toEqual([false, true])
  })

  it('follows member_profiles row security: own row readable, no direct update', async () => {
    await db.exec('set local role authenticated')
    expect((await db.query<{ user_id: string; announcement_email_opt_out: boolean }>(
      'select user_id,announcement_email_opt_out from public.member_profiles')).rows).toEqual([{ user_id: id(10), announcement_email_opt_out: false }])
    const direct = await db.query('update public.member_profiles set announcement_email_opt_out=true')
    expect(direct.affectedRows).toBe(0)
    await db.exec('reset role')
    expect(await optedOut()).toEqual([])
    expect((await db.query("select 1 from pg_policies where schemaname='public' and tablename='member_profiles' and cmd in ('UPDATE','ALL')")).rows).toEqual([])
  })
})

describe('officer-opening email', () => {
  it('is not queued for a member who opted out', async () => {
    await setMine(true)
    await publishOpening()
    expect(await outbox()).toEqual([{ recipient: 'm11@oberlin.edu', status: 'PENDING' }])
  })

  it('is skipped when a member opts out after it was queued, and the claim returns the member id', async () => {
    await publishOpening()
    expect(await outbox()).toHaveLength(2)
    await asUser(10)
    await setMine(true)
    await db.exec('set local role service_role')
    const claimed = (await db.query<{ recipient: string; userId: string; claimToken: string }>('select * from public.claim_officer_email()')).rows
    expect(claimed).toHaveLength(1)
    expect(claimed[0]).toMatchObject({ recipient: 'm11@oberlin.edu', userId: id(11) })
    expect((await db.query('select * from public.claim_officer_email()')).rows).toHaveLength(0)
    await db.exec('reset role')
    expect(await outbox()).toEqual([{ recipient: 'm10@oberlin.edu', status: 'SKIPPED' }, { recipient: 'm11@oberlin.edu', status: 'SENDING' }])
  })

  it('keeps the recreated claim function away from browser roles', async () => {
    const claim = 'public.claim_officer_email()'
    expect([await can('anon', claim), await can('authenticated', claim), await can('service_role', claim)]).toEqual([false, false, true])
  })
})

describe('new project email', () => {
  const announce = async () => (await db.query<{ result: { announced: boolean; recipients?: unknown[] } }>(
    'select public.announce_published_project($1) result', [id(30)])).rows[0].result

  it('goes only to members who have not opted out, while everyone active still gets the portal notice', async () => {
    await setMine(true)
    const result = await announce()
    expect(result.announced).toBe(true)
    expect(result.recipients).toEqual([{ userId: id(11), email: 'm11@oberlin.edu', displayName: 'Member 11' }])
    expect((await db.query<{ user_id: string }>("select user_id from public.member_notifications where kind='NEW_PROJECT' order by user_id")).rows)
      .toEqual([{ user_id: id(10) }, { user_id: id(11) }])
    expect((await db.query<{ recipients: number }>('select recipients from public.project_announcements where project_id=$1', [id(30)])).rows).toEqual([{ recipients: 1 }])
    expect((await announce()).announced).toBe(false)
  })

  it('stays callable only by the server', async () => {
    const fn = 'public.announce_published_project(uuid)'
    expect([await can('anon', fn), await can('authenticated', fn), await can('service_role', fn)]).toEqual([false, false, true])
  })
})
