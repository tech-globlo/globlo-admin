import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CButton, CFormLabel, CFormInput, CListGroup, CListGroupItem } from '@coreui/react'
import api from '../lib/api'

// Minimal search-as-you-type picker over an admin list endpoint (users/destinations/trips/species).
const EntityPicker = ({ label, placeholder, endpoint, labelKey, sublabelKey, value, onChange, required }) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

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

  return (
    <div style={{ position: 'relative' }}>
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
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && query.trim() && (
            <CListGroup style={{ position: 'absolute', zIndex: 20, width: '100%', maxHeight: 220, overflowY: 'auto' }}>
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
            </CListGroup>
          )}
        </>
      )}
    </div>
  )
}

export default EntityPicker
