import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Drop-in replacement for a single `useState` call that mirrors the value
 * into the URL's query string instead of local component state — so list
 * screens (search text, sort column/order, page, filters) survive
 * navigating away (e.g. to a detail page) and back, since the browser
 * restores the full URL including query params on back-navigation, while
 * plain `useState` gets wiped when React Router unmounts the route.
 *
 * Updates use `{ replace: true }` so every filter change doesn't pile up
 * its own browser-history entry — only real navigations do.
 *
 * @param {string} key - query param name
 * @param {*} defaultValue - value used when the param is absent; also the
 *   value that causes the param to be OMITTED from the URL when set (keeps
 *   URLs clean instead of always carrying every default explicitly)
 * @param {{ type?: 'string' | 'number' }} [options]
 */
export function useSearchParamState(key, defaultValue, { type = 'string' } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()

  const raw = searchParams.get(key)

  const value = useMemo(() => {
    if (raw === null) return defaultValue
    if (type === 'number') {
      const n = parseInt(raw, 10)
      return Number.isNaN(n) ? defaultValue : n
    }
    return raw
  }, [raw, defaultValue, type])

  const setValue = useCallback(
    (next) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          const current = params.has(key)
            ? type === 'number'
              ? parseInt(params.get(key), 10)
              : params.get(key)
            : defaultValue
          const resolved = typeof next === 'function' ? next(current) : next

          if (resolved === defaultValue || resolved === '' || resolved === undefined || resolved === null) {
            params.delete(key)
          } else {
            params.set(key, String(resolved))
          }
          return params
        },
        { replace: true },
      )
    },
    [key, defaultValue, type, setSearchParams],
  )

  return [value, setValue]
}
