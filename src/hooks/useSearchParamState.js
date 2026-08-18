import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Mirrors a set of local-state-like fields (search text, sort column/order,
 * page, filters) into the URL's query string instead of component state —
 * so list screens survive navigating away (e.g. to a detail page) and back,
 * since the browser restores the full URL including query params on
 * back-navigation, while plain `useState` gets wiped when React Router
 * unmounts the route.
 *
 * IMPORTANT — always update multiple fields in ONE `setValues({...})` call
 * when they change together (e.g. `setValues({ role, page: 1 })` on a
 * filter change, not `setRole(role); setPage(1)` as two separate calls).
 * react-router's `setSearchParams` functional updater is seeded from the
 * CURRENT render's `searchParams`, not a "latest pending state" updater —
 * calling it twice synchronously in one handler makes the second call
 * silently overwrite the first (both `navigate()` from the same stale
 * base). A single hook instance covering the whole schema, with a single
 * `setValues` that merges all changes into one `setSearchParams` call,
 * sidesteps that entirely instead of relying on cross-call chaining that
 * react-router doesn't actually guarantee.
 *
 * @param {Record<string, { default: *, type?: 'string' | 'number' }>} schema
 * @returns {[Record<string, *>, (updates: Record<string, *>) => void]}
 */
export function useSearchParamsState(schema) {
  const [searchParams, setSearchParams] = useSearchParams()

  const values = useMemo(() => {
    const result = {}
    for (const key of Object.keys(schema)) {
      const { default: defaultValue, type = 'string' } = schema[key]
      const raw = searchParams.get(key)
      if (raw === null) {
        result[key] = defaultValue
      } else if (type === 'number') {
        const n = parseInt(raw, 10)
        result[key] = Number.isNaN(n) ? defaultValue : n
      } else {
        result[key] = raw
      }
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const setValues = useCallback(
    (updates) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          for (const key of Object.keys(updates)) {
            const fieldSchema = schema[key] || {}
            const defaultValue = fieldSchema.default
            const resolved = updates[key]

            if (
              resolved === defaultValue ||
              resolved === '' ||
              resolved === undefined ||
              resolved === null
            ) {
              params.delete(key)
            } else {
              params.set(key, String(resolved))
            }
          }
          return params
        },
        { replace: true },
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setSearchParams],
  )

  return [values, setValues]
}
