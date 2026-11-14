// The `Database` type the Supabase clients are created with, and the names the rest of the
// code uses to refer to tables, rows and database functions. Everything here is derived
// from `database.types.ts`, which `npm run db:types` generates from database/migrations/.
import type { Database as GeneratedDatabase } from './database.types'

export type { Enums, Json, Tables, TablesInsert, TablesUpdate } from './database.types'

type GeneratedSchema = GeneratedDatabase['public']
type GeneratedFunctions = GeneratedSchema['Functions']

// The generator types every function argument as never null. Postgres accepts NULL for any
// argument, and this app sends it on purpose: no review note, no id yet for a new milestone,
// a cleared class year. So NULL is allowed for every argument here. The function name, the
// argument names and their other types are still checked.
type NullableArgs<Args> = string extends keyof Args ? Args : { [Name in keyof Args]: Args[Name] | null }
type WithNullableArgs<Fn> = Fn extends { Args: infer Args }
  ? { [Key in keyof Fn]: Key extends 'Args' ? NullableArgs<Args> : Fn[Key] }
  : Fn

export type Database = {
  [Schema in keyof GeneratedDatabase]: Schema extends 'public'
    ? {
        [Key in keyof GeneratedSchema]: Key extends 'Functions'
          ? { [Name in keyof GeneratedFunctions]: WithNullableArgs<GeneratedFunctions[Name]> }
          : GeneratedSchema[Key]
      }
    : GeneratedDatabase[Schema]
}

/** A table the API serves. */
export type TableName = keyof Database['public']['Tables']
/** A database function the API serves under `rpc`. */
export type RpcName = keyof Database['public']['Functions']
export type RpcArgs<Name extends RpcName> = Database['public']['Functions'][Name]['Args']
export type RpcReturns<Name extends RpcName> = Database['public']['Functions'][Name]['Returns']
