import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'

/** Load JSON from the club API. `reload` refetches (use it for pull to refresh and after a change). */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [refreshing, setRefreshing] = useState(false)
  const latest = useRef(0)
  const load = useCallback(async (quiet: boolean) => {
    if (!path) return
    const run = ++latest.current
    if (quiet) setRefreshing(true); else setLoading(true)
    try { const result = await api<T>(path); if (run === latest.current) { setData(result); setError(null) } }
    catch (caught) { if (run === latest.current) setError(caught) }
    finally { if (run === latest.current) { setLoading(false); setRefreshing(false) } }
  }, [path])
  useEffect(() => { void load(false) }, [load])
  const reload = useCallback(() => load(true), [load])
  return { data, error, loading, refreshing, reload, setData }
}
