// Regenerates lib/supabase/database.types.ts, the `Database` type the Supabase clients are
// created with, from the schema in database/migrations/.
//
//   npm run db:types              rewrite the file
//   npm run db:types -- --check   write nothing; exit 1 if the committed file is out of date
//
// No real database is read or changed. Every migration is applied, in file-name order, to a
// throwaway in-process Postgres (PGlite), and Supabase's own generator, the one behind
// `supabase gen types`, introspects that. Run it after adding or changing a migration.
// tests/integration/database-types.test.ts fails while the committed file is out of date.
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { generateTypescript, sortGeneratorMetadata } from '@supabase/postgrest-typegen/generation'
import { introspect } from '@supabase/postgrest-typegen/introspection'
import { readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
export const migrationsDir = join(repoRoot, 'database', 'migrations')
export const databaseTypesFile = join(repoRoot, 'lib', 'supabase', 'database.types.ts')

// Only `public` is served by the API. `private` holds helper functions the app never calls.
const API_SCHEMAS = ['public']

// A hosted Supabase project already has these roles, schemas and functions before the first
// migration runs. PGlite is plain Postgres, so stand-ins are created first. They hold just
// enough for the migrations to apply: none is in an API schema, so none reaches the output.
// A migration that starts using another platform object needs a stand-in added here.
const SUPABASE_PLATFORM_STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema extensions;
create extension pgcrypto with schema extensions;
set search_path to "$user", public, extensions;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  aud text,
  role text,
  email text,
  phone text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  banned_until timestamptz,
  deleted_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
create function auth.email() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.email', true), '') $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  owner_id text,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  owner_id text,
  metadata jsonb,
  user_metadata jsonb,
  path_tokens text[] generated always as (string_to_array(name, '/')) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now()
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
create function storage.filename(name text) returns text language sql immutable as $$ select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)] $$;
create function storage.extension(name text) returns text language sql immutable as $$ select reverse(split_part(reverse(name), '.', 1)) $$;

create schema vault;
create table vault.decrypted_secrets (id uuid, name text, description text, decrypted_secret text);

create schema net;
create function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000) returns bigint language sql as $$ select 0::bigint $$;

create schema cron;
create table cron.job (jobid bigint generated always as identity primary key, jobname text unique, schedule text, command text, active boolean default true);
create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$ insert into cron.job (jobname, schedule, command) values (job_name, schedule, command) on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
create function cron.unschedule(job_name text) returns boolean language sql as $$ with removed as (delete from cron.job where jobname = job_name returning 1) select exists (select 1 from removed) $$;
`

// Extensions Supabase hosts that PGlite cannot load. The stand-ins above cover what the
// migrations call from them, so their `create extension` statements are skipped.
const HOSTED_ONLY_EXTENSIONS = ['pg_cron', 'pg_net']
const hostedOnlyExtensionStatement = new RegExp(
  String.raw`^[ \t]*create\s+extension\s+(?:if\s+not\s+exists\s+)?"?(?:${HOSTED_ONLY_EXTENSIONS.join('|')})"?[^;]*;`,
  'gim'
)

const HEADER = `// Generated by \`npm run db:types\` from database/migrations/*.sql. Do not edit by hand:
// change a migration, then run the script again.
`

export function listMigrationFiles() {
  return readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()
}

export async function generateDatabaseTypes() {
  const db = new PGlite({ extensions: { pgcrypto } })
  try {
    await db.exec(SUPABASE_PLATFORM_STUBS)
    for (const name of listMigrationFiles()) {
      const sql = readFileSync(join(migrationsDir, name), 'utf8').replace(hostedOnlyExtensionStatement, '')
      try {
        await db.exec(sql)
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        throw new Error(
          `database/migrations/${name} did not apply to the in-process database: ${reason}\n` +
          'If it names something Supabase provides (auth, storage, cron, net, vault, an extension), ' +
          'add a stand-in to SUPABASE_PLATFORM_STUBS in scripts/generate-database-types.ts.',
          { cause: error }
        )
      }
    }
    const metadata = sortGeneratorMetadata(await introspect(db, { includedSchemas: API_SCHEMAS }))
    // No `postgrestVersion` is passed, so the output declares none and supabase-js types the
    // client for PostgREST 12. That only turns off `maxAffected()` and spreading a to-many
    // embed, which need 13; pass the hosted project's version here to turn them on.
    const types = await generateTypescript(metadata, { detectOneToOneRelationships: true })
    return HEADER + types
  } finally {
    await db.close()
  }
}

async function main() {
  const check = process.argv.includes('--check')
  const generated = await generateDatabaseTypes()
  const label = relative(repoRoot, databaseTypesFile)
  let current: string | null = null
  try { current = readFileSync(databaseTypesFile, 'utf8') } catch { /* first run: no file yet */ }
  if (current === generated) {
    console.log(`${label} is up to date with ${listMigrationFiles().length} migrations.`)
    return
  }
  if (check) {
    console.error(`${label} is out of date with database/migrations. Run \`npm run db:types\` and commit the result.`)
    process.exitCode = 1
    return
  }
  writeFileSync(databaseTypesFile, generated)
  console.log(`Wrote ${label} from ${listMigrationFiles().length} migrations.`)
}

const invokedDirectly = process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) await main()
