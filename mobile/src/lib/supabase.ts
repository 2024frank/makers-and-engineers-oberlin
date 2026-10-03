import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { SUPABASE_KEY, SUPABASE_URL } from './config'

// The keychain holds about 2 KB per item and a session is larger, so it is stored in pieces.
const CHUNK = 1800
const secureStorage = {
  async getItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.n`))
    if (!count) return null
    const parts = await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${key}.${index}`)))
    return parts.some(part => part === null) ? null : parts.join('')
  },
  async setItem(key: string, value: string) {
    const previous = Number(await SecureStore.getItemAsync(`${key}.n`)) || 0
    const count = Math.ceil(value.length / CHUNK)
    for (let index = 0; index < count; index++) await SecureStore.setItemAsync(`${key}.${index}`, value.slice(index * CHUNK, (index + 1) * CHUNK))
    await SecureStore.setItemAsync(`${key}.n`, String(count))
    for (let index = count; index < previous; index++) await SecureStore.deleteItemAsync(`${key}.${index}`)
  },
  async removeItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.n`)) || 0
    for (let index = 0; index < count; index++) await SecureStore.deleteItemAsync(`${key}.${index}`)
    await SecureStore.deleteItemAsync(`${key}.n`)
  },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: secureStorage, storageKey: 'moe-session', autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
})
