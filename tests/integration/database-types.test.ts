// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { databaseTypesFile, generateDatabaseTypes, listMigrationFiles } from '@/scripts/generate-database-types'

// The Supabase clients are typed from this file, so a migration that is not reflected in it
// leaves the compiler checking queries against the old schema.
it('lib/supabase/database.types.ts is what the migrations generate', async () => {
  expect(listMigrationFiles().length).toBeGreaterThan(0)
  const generated = await generateDatabaseTypes()
  const committed = readFileSync(databaseTypesFile, 'utf8')
  expect(generated === committed, 'database.types.ts is out of date with database/migrations. Run `npm run db:types` and commit the result.').toBe(true)
}, 120000)
