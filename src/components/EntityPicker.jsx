import React, { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { CButton, CFormLabel, CFormInput, CListGroup, CListGroupItem } from '@coreui/react'
import api from '../lib/api'

// Minimal search-as-you-type picker over an admin list endpoint (users/destinations/trips/species).
const EntityPicker = ({ label, placeholder, endpoint, labelKey, sublabelKey, value, onChange, required }) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputWrapRef = useRef(null)
  // Dropdown is portaled to document.body (see rect/portal block below) so a
  // scrollable ancestor — e.g. the bulk-add table's overflowX:'auto' wrapper,
  // which the overflow-x/overflow-y CSS coupling also makes clip vertically —
  // can never cut it off. position:fixed + this rect keeps it visually
  // anchored under the input regardless of where in the DOM it now renders.
  const [rect, setRect] = useState(null)

  const { data, isFetching } = useQuery({
    queryKey: ['entity-picker', endpoint, query],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '10', offset: '0' })
      if (query.trim()) params.set('search', query.trim())
      const res = await api.get(`${endpoint}?${params}`)
      return res.data.data
    },
    enabled: open,
  })
  const results = data ? Object.values(data).find((v) => Array.isArray(v)) || [] : []

  const updateRect = () => {
    if (!inputWrapRef.current) return
    const r = inputWrapRef.current.getBoundingClientRect()
    setRect({ top: r.bottom, left: r.left, width: r.width })
  }

  const openDropdown = () => {
    updateRect()
    setOpen(true)
  }

  // Keeps the portaled dropdown tracking the input while open — the table
  // this picker usually sits in scrolls horizontally, and the page itself
  // can scroll/resize, both of which would otherwise leave the dropdown
  // floating over the wrong spot since it's no longer a DOM sibling of the
  // input once portaled.
  useLayoutEffect(() => {
    if (!open) return
    updateRect()
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div style={{ position: 'relative' }} ref={inputWrapRef}>
      {label && <CFormLabel className="small">{label}{required ? ' *' : ''}</CFormLabel>}
      {value ? (
        <div className="d-flex align-items-center justify-content-between border rounded px-2 py-1 small">
          <div>
            <div className="fw-semibold">{value[labelKey]}</div>
            {sublabelKey && <div className="text-muted">{value[sublabelKey]}</div>}
          </div>
          <CButton size="sm" color="link" className="p-0" onClick={() => onChange(null)}>Change</CButton>
        </div>
      ) : (
        <>
          <CFormInput
            size="sm"
            placeholder={placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); openDropdown() }}
            onFocus={openDropdown}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && query.trim() && rect && createPortal(
            <CListGroup
              // Pressing a result fires the input's blur before the button's
              // click (mousedown moves focus first) — the 150ms delay above
              // was meant to let the click win that race, but a query
              // re-render (isFetching flipping, new results swapping in)
              // between mousedown and the click landing can still beat it,
              // closing the list first and swallowing the click. Blocking
              // the mousedown's default action keeps focus on the input the
              // whole time, so blur never fires for a click in here at all —
              // onClick below is then the only thing that closes the list.
              onMouseDown={(e) => e.preventDefault()}
              style={{
                position: 'fixed',
                top: rect.top,
                left: rect.left,
                width: rect.width,
                zIndex: 2000, // above CModal's own backdrop/dialog stack
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {isFetching && <CListGroupItem className="small text-muted">Searching…</CListGroupItem>}
              {!isFetching && results.length === 0 && (
                <CListGroupItem className="small text-muted">No matches.</CListGroupItem>
              )}
              {results.map((r) => (
                <CListGroupItem
                  key={r.id}
                  component="button"
                  type="button"
                  className="small text-start"
                  onClick={() => { onChange(r); setQuery(''); setOpen(false) }}
                >
                  <div className="fw-semibold">{r[labelKey]}</div>
                  {sublabelKey && <div className="text-muted">{r[sublabelKey]}</div>}
                </CListGroupItem>
              ))}
            </CListGroup>,
            document.body,
          )}
        </>
      )}
    </div>
  )
}

export default EntityPicker
