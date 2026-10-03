// Public values only. The same ones ship in the website's browser bundle.
export const SUPABASE_URL = 'https://qaudokydctziaoakvkyv.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_hseUWPre4UTc0TT0tMigJA_-F9rU0lu'
/** The club website. Set EXPO_PUBLIC_API_URL to point a development build at another server. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://makeoberlin.site').replace(/\/$/, '')
