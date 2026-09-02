import React, { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard, CCardBody,
  CCol, CRow,
  CBadge, CButton, CSpinner, CAlert,
  CFormInput, CFormSelect,
  COffcanvas, COffcanvasHeader, COffcanvasTitle, COffcanvasBody,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch, cilTrash, cilImage, cilX, cilCheck,
  cilViewModule, cilList,
} from '@coreui/icons'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

// -- Helpers ------------------------------------------------------------------
const fmtBytes = (b) => {
  if (!b) return '-'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(2)} MB`
}
const getFilename = (m) => m.metadata?.originalFilename || m.key?.split('/').pop() || m.key || '-'

const STATUS_COLOR = { READY: 'success', PROCESSING: 'warning', REJECTED: 'danger', FAILED: 'danger' }

const MEDIA_TYPES = [
  'PROFILE_PHOTO', 'PORTFOLIO',
  'TRIP_COVER', 'TRIP_GALLERY', 'TRIP_HIGHLIGHT', 'TRIP_ITINERARY',
  'DESTINATION_PHOTO', 'REVIEW_PHOTO', 'MESSAGE_ATTACHMENT',
  'SERVICE_PHOTO', 'VERIFICATION_DOCUMENT', 'OTHER',
]

// -- Tile card ----------------------------------------------------------------
const MediaCard = ({ item, selected, onSelect, onClick, onMarkBroken, brokenIds }) => {
  const isBroken = brokenIds.has(item.id)
  const isImage = item.mimeType?.startsWith('image/')
  const isVideo = item.mimeType?.startsWith('video/')
  const displayUrl = item.thumbUrl || item.url

  return (
    <div
      style={{
        position: 'relative', borderRadius: 6, overflow: 'hidden',
        aspectRatio: '1', background: '#1a1a2e', cursor: 'pointer',
        outline: selected ? '2px solid #321fdb' : isBroken ? '2px solid #dc3545' : 'none',
        outlineOffset: selected ? -2 : 0, transition: 'outline 0.1s',
      }}
      onClick={() => onClick(item)}
    >
      {/* Checkbox */}
      <div
        style={{ position: 'absolute', top: 6, left: 6, zIndex: 10 }}
        onClick={(e) => { e.stopPropagation(); onSelect(item.id) }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 3,
          background: selected ? '#321fdb' : 'rgba(255,255,255,0.85)',
          border: selected ? '2px solid #321fdb' : '2px solid rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}>
          {selected && <CIcon icon={cilCheck} style={{ color: '#fff', width: 10, height: 10 }} />}
        </div>
      </div>

      {/* Broken badge */}
      {isBroken && (
        <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 10 }}>
          <CBadge color="danger" style={{ fontSize: 10 }}>broken</CBadge>
        </div>
      )}

      {isImage && !isBroken ? (
        <img
          src={displayUrl} alt={getFilename(item)} loading="lazy"
          onError={() => onMarkBroken(item.id)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : isVideo ? (
        <>
          <video
            src={item.url} poster={item.thumbUrl || undefined}
            muted preload="metadata"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '12px solid #fff', marginLeft: 3 }} />
            </div>
          </div>
        </>
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: isBroken ? '#dc3545' : '#666' }}>
          <CIcon icon={cilImage} style={{ width: 28, height: 28 }} />
          <div style={{ fontSize: 10, marginTop: 4, textAlign: 'center', padding: '0 6px', wordBreak: 'break-all' }}>
            {item.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', padding: '12px 6px 4px', fontSize: 10, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {getFilename(item)}
      </div>

      {item.status !== 'READY' && (
        <div style={{ position: 'absolute', top: 6, right: isBroken ? 52 : 6, zIndex: 10 }}>
          <CBadge color={STATUS_COLOR[item.status] || 'secondary'} style={{ fontSize: 9 }}>{item.status}</CBadge>
        </div>
      )}
    </div>
  )
}

// -- List row -----------------------------------------------------------------
const MediaRow = ({ item, selected, onSelect, onClick, onMarkBroken, brokenIds }) => {
  const isBroken = brokenIds.has(item.id)
  const isImage = item.mimeType?.startsWith('image/')
  const filename = getFilename(item)
  const thumb = item.thumbUrl || item.url
  const mimeShort = item.mimeType?.split('/')[1]?.toUpperCase() || item.mimeType || '-'

  return (
    <CTableRow style={{ cursor: 'pointer' }} onClick={() => onClick(item)}>
      <CTableDataCell>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(item.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </CTableDataCell>
      <CTableDataCell>
        <div style={{ width: 40, height: 40, borderRadius: 4, overflow: 'hidden', background: '#1a1a2e', flexShrink: 0 }}>
          {isImage && !isBroken ? (
            <img
              src={thumb} alt={filename} loading="lazy"
              onError={() => onMarkBroken(item.id)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CIcon icon={cilImage} style={{ width: 18, height: 18, color: isBroken ? '#dc3545' : '#666' }} />
            </div>
          )}
        </div>
      </CTableDataCell>
      <CTableDataCell className="small" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {filename}
        {isBroken && <CBadge color="danger" className="ms-1" style={{ fontSize: 9 }}>broken</CBadge>}
      </CTableDataCell>
      <CTableDataCell><CBadge color="light" textColor="dark" className="border small">{item.type}</CBadge></CTableDataCell>
      <CTableDataCell className="small text-muted" title={item.mimeType}>{mimeShort}</CTableDataCell>
      <CTableDataCell className="small">{fmtBytes(item.size)}</CTableDataCell>
      <CTableDataCell>
        <CBadge color={STATUS_COLOR[item.status] || 'secondary'}>{item.status}</CBadge>
      </CTableDataCell>
      <CTableDataCell className="small text-muted">{item.user?.name || '-'}</CTableDataCell>
      <CTableDataCell className="small text-muted">{fmtDate(item.createdAt)}</CTableDataCell>
    </CTableRow>
  )
}

// -- Sidebar detail -----------------------------------------------------------
const MediaSidebar = ({ item, brokenIds, onClose, onDelete, onToggleApproval, deleting }) => {
  if (!item) return null
  const isBroken = brokenIds.has(item.id)
  const isImage = item.mimeType?.startsWith('image/')
  const filename = getFilename(item)

  const usedIn = []
  if (item.trip) usedIn.push({ label: 'Trip', value: item.trip.title })
  if (item.destination) usedIn.push({ label: 'Destination', value: item.destination.name })
  if (item.review) usedIn.push({ label: 'Review', value: item.review.id })
  if (item.serviceDetails) usedIn.push({ label: 'Service', value: item.serviceDetails.title })
  if (item.verificationDocument) {
    usedIn.push({
      label: 'Verification Doc',
      value: `${(item.verificationDocument.docType || '').replace(/_/g, ' ').toLowerCase()} (${item.verificationDocument.verificationStatus})`,
    })
  }
  // PROFILE_PHOTO / PROFILE_COVER / PORTFOLIO have no typed parent FK in the
  // schema — the uploader IS the entity it belongs to, so reuse the
  // already-fetched `user` relation instead of a dedicated link field.
  // User.profilePhotoUrl is a legacy fallback only — the app actually
  // resolves "current" as the latest READY Media row per (user, type), same
  // as UserService.getProfile / ProfileService.getPublicProfile. The backend
  // mirrors that exact definition into `isCurrentProfileMedia` (see
  // adminListMedia) rather than this comparing against a stale field.
  // PORTFOLIO is a multi-image collection with no single "current" concept.
  if (['PROFILE_PHOTO', 'PROFILE_COVER', 'PORTFOLIO'].includes(item.type) && item.user) {
    if (item.type === 'PORTFOLIO') {
      usedIn.push({ label: 'Profile', value: item.user.name })
    } else {
      usedIn.push({
        label: item.type === 'PROFILE_PHOTO' ? 'Profile' : 'Cover',
        value: `${item.user.name} (${item.isCurrentProfileMedia ? 'current' : 'previous'})`,
      })
    }
  }
  if (item.messages?.length > 0) {
    item.messages.forEach((m) => {
      usedIn.push({ label: 'Message', value: `sent by ${m.sender?.name || 'unknown'}` })
    })
  }
  if (item.mediaSightings?.length > 0) {
    item.mediaSightings.forEach((s) => {
      usedIn.push({ label: 'Sighting', value: `${s.species || 'unspecified species'} — ${s.trip?.title || 'trip'}` })
    })
  }
  if (item.promotedFromSightings?.length > 0) {
    item.promotedFromSightings.forEach((s) => {
      usedIn.push({ label: 'Promoted Sighting', value: s.sighting?.speciesText || 'unspecified species' })
    })
  }

  return (
    <COffcanvas placement="end" visible={!!item} onHide={onClose} scroll backdrop={false} style={{ width: 340 }}>
      <COffcanvasHeader style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
        <COffcanvasTitle className="small fw-semibold text-truncate" style={{ maxWidth: 240 }}>{filename}</COffcanvasTitle>
        <CButton color="link" className="p-0 ms-auto" onClick={onClose}>
          <CIcon icon={cilX} size="sm" />
        </CButton>
      </COffcanvasHeader>
      <COffcanvasBody className="p-0">
        {/* Preview */}
        <div style={{ background: '#111', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          {item.mimeType?.startsWith('video/') ? (
            <video src={item.url} controls style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 4, display: 'block' }} />
          ) : isImage && !isBroken ? (
            <img src={item.url} alt={filename} style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 4 }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: isBroken ? '#dc3545' : '#888' }}>
              <CIcon icon={cilImage} style={{ width: 48, height: 48 }} />
              {isBroken && <div className="small mt-2">Image failed to load</div>}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px' }}>
          <div className="d-flex flex-wrap gap-1 mb-3">
            <CBadge color={STATUS_COLOR[item.status] || 'secondary'}>{item.status}</CBadge>
            <CBadge color="light" textColor="dark" className="border">{item.type}</CBadge>
            {isBroken && <CBadge color="danger">Broken</CBadge>}
            {item.isApproved === false && <CBadge color="warning" textColor="dark">Hidden</CBadge>}
          </div>

          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Filename',      filename],
                ['MIME type',     item.mimeType || '-'],
                ['Size',          fmtBytes(item.size)],
                ['Dimensions',    item.width && item.height ? `${item.width} x ${item.height} px` : '-'],
                ['Storage',       item.storageProvider || '-'],
                ['Uploaded by',   item.user?.name || '-'],
                ['Uploader email',item.user?.email || '-'],
                ['Caption',       item.caption || '-'],
                ['Day #',         item.dayNumber ?? '-'],
                ['Uploaded',      fmtDate(item.createdAt)],
                ['Updated',       fmtDate(item.updatedAt)],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                  <td style={{ padding: '5px 0', color: 'var(--cui-secondary-color)', minWidth: 110 }}>{label}</td>
                  <td style={{ padding: '5px 0 5px 8px', wordBreak: 'break-all', fontWeight: 500 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3">
            <div className="small fw-semibold text-muted mb-1">Used In</div>
            {usedIn.length > 0 ? (
              <div className="d-flex flex-column gap-1">
                {usedIn.map((u, i) => (
                  <div key={i} className="d-flex gap-2 align-items-center small">
                    <CBadge color="light" textColor="dark" className="border">{u.label}</CBadge>
                    <span className="text-truncate">{u.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="small text-muted">Not linked to any record</div>
            )}
          </div>

          <div className="mt-3 d-flex align-items-center gap-2">
            <div className="small fw-semibold text-muted" style={{ minWidth: 80 }}>Visibility</div>
            <div className="d-flex gap-2">
              <CButton size="sm" color={item.isApproved !== false ? 'success' : 'outline-success'} onClick={() => onToggleApproval(item.id, true)}>Visible</CButton>
              <CButton size="sm" color={item.isApproved === false ? 'warning' : 'outline-warning'} onClick={() => onToggleApproval(item.id, false)}>Hidden</CButton>
            </div>
          </div>

          <div className="mt-3">
            <div className="small fw-semibold text-muted mb-2">Storage Keys</div>
            {[
              ['Original', item.key],
              ['Thumbnail', item.thumbKey],
              ['Compressed', item.compressedKey],
            ].map(([label, val]) => val ? (
              <div key={label} className="mb-2">
                <div className="small text-muted mb-1">{label}</div>
                <div className="small" style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 11, background: 'var(--cui-tertiary-bg)', padding: '4px 6px', borderRadius: 4 }}>
                  {val}
                </div>
              </div>
            ) : null)}
          </div>

          <div className="mt-4">
            <CButton
              color="danger" size="sm" className="w-100"
              onClick={() => window.confirm(`Delete "${filename}"? This will remove it from S3.`) && onDelete(item.id)}
              disabled={deleting}
            >
              {deleting ? <CSpinner size="sm" className="me-1" /> : <CIcon icon={cilTrash} className="me-1" size="sm" />}
              Delete Permanently
            </CButton>
          </div>
        </div>
      </COffcanvasBody>
    </COffcanvas>
  )
}

// -- Main component -----------------------------------------------------------
const MediaLibrary = () => {
  const qc = useQueryClient()
  const [page, setPage]               = useState(1)
  const [pageSize, setPageSize]       = useState(20)
  const [search, setSearch]           = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [typeFilter, setTypeFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [mimeFilter, setMimeFilter]   = useState('all')
  const [brokenOnly, setBrokenOnly]   = useState(false)
  const [layout, setLayout]           = useState('tiles') // 'tiles' | 'list'
  const [selected, setSelected]       = useState(new Set())
  const [sidebarItem, setSidebarItem] = useState(null)
  const [brokenIds, setBrokenIds]     = useState(new Set())
  const [bulkError, setBulkError]     = useState(null)

  const offset = (page - 1) * pageSize
  const queryKey = ['admin-media', { page, pageSize, search, typeFilter, statusFilter, mimeFilter }]

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: pageSize, offset })
      if (search) params.set('search', search)
      if (typeFilter) params.set('type', typeFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (mimeFilter !== 'all') params.set('mimeCategory', mimeFilter)
      params.set('sortBy', 'createdAt')
      params.set('sortOrder', 'desc')
      const res = await api.get(`/api/admin/media?${params}`)
      return res.data.data
    },
    placeholderData: (prev) => prev,
  })

  const markBroken = useCallback((id) => setBrokenIds(prev => new Set(prev).add(id)), [])

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/media/${id}`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['admin-media'] })
      if (sidebarItem?.id === id) setSidebarItem(null)
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
    },
    onError: (err) => alert(err.response?.data?.message || 'Delete failed'),
  })

  const bulkDeleteMut = useMutation({
    mutationFn: (ids) => api.delete('/api/admin/media/bulk', { data: { ids } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-media'] }); setSelected(new Set()); setBulkError(null) },
    onError: (err) => setBulkError(err.response?.data?.message || 'Bulk delete failed'),
  })

  const approvalMut = useMutation({
    mutationFn: ({ id, isApproved }) => api.patch(`/api/admin/media/${id}/approval`, { isApproved }),
    onSuccess: (res, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-media'] })
      if (sidebarItem?.id === id) setSidebarItem(prev => ({ ...prev, isApproved: res.data.data?.media?.isApproved }))
    },
  })

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const toggleAll = () => {
    if (!data?.media) return
    const visible = brokenOnly ? data.media.filter(m => brokenIds.has(m.id)) : data.media
    const allSel = visible.every(m => selected.has(m.id))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSel) visible.forEach(m => next.delete(m.id))
      else visible.forEach(m => next.add(m.id))
      return next
    })
  }

  const handleBulkDelete = () => {
    const ids = [...selected]
    if (!ids.length) return
    if (!window.confirm(`Delete ${ids.length} media item(s) permanently? This cannot be undone.`)) return
    bulkDeleteMut.mutate(ids)
  }

  const displayedMedia = brokenOnly ? (data?.media || []).filter(m => brokenIds.has(m.id)) : (data?.media || [])
  const allVisibleSelected = displayedMedia.length > 0 && displayedMedia.every(m => selected.has(m.id))

  return (
    <>
      <CCard>
        <CCardBody>
          {/* Toolbar */}
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <div className="fw-semibold me-2">
              Media Library

            </div>

            {selected.size > 0 && (
              <>
                <CButton color="danger" size="sm" onClick={handleBulkDelete} disabled={bulkDeleteMut.isLoading}>
                  {bulkDeleteMut.isLoading ? <CSpinner size="sm" className="me-1" /> : <CIcon icon={cilTrash} className="me-1" size="sm" />}
                  Delete {selected.size} selected
                </CButton>
                <CButton color="secondary" size="sm" variant="outline" onClick={() => setSelected(new Set())} disabled={bulkDeleteMut.isLoading}>
                  Clear selection
                </CButton>
              </>
            )}

            <div className="ms-auto d-flex align-items-center gap-3">
              {/* Broken only toggle */}
              <label className="d-flex align-items-center gap-1 small" style={{ cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={brokenOnly} onChange={e => setBrokenOnly(e.target.checked)} />
                <span className={brokenOnly ? 'text-danger fw-semibold' : ''}>
                  Broken only {brokenIds.size > 0 && `(${brokenIds.size})`}
                </span>
              </label>

              {/* Layout toggle */}
              <div className="d-flex gap-1">
                <CButton
                  size="sm"
                  color={layout === 'tiles' ? 'primary' : 'outline-secondary'}
                  title="Tile view"
                  onClick={() => setLayout('tiles')}
                  style={{ padding: '3px 8px' }}
                >
                  <CIcon icon={cilViewModule} size="sm" />
                </CButton>
                <CButton
                  size="sm"
                  color={layout === 'list' ? 'primary' : 'outline-secondary'}
                  title="List view"
                  onClick={() => setLayout('list')}
                  style={{ padding: '3px 8px' }}
                >
                  <CIcon icon={cilList} size="sm" />
                </CButton>
              </div>
            </div>
          </div>

          {/* Filters */}
          <CRow className="g-2 mb-3">
            <CCol md={4}>
              <form onSubmit={handleSearch} className="d-flex gap-1">
                <CFormInput size="sm" placeholder="Search filename, caption." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
                <CButton type="submit" color="primary" size="sm"><CIcon icon={cilSearch} size="sm" /></CButton>
              </form>
            </CCol>
            <CCol md={2}>
              <CFormSelect size="sm" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
                <option value="">All types</option>
                {MEDIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </CFormSelect>
            </CCol>
            <CCol md={2}>
              <CFormSelect size="sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
                <option value="">All statuses</option>
                {['READY', 'PROCESSING', 'REJECTED', 'FAILED'].map(s => <option key={s} value={s}>{s}</option>)}
              </CFormSelect>
            </CCol>
            <CCol md={2}>
              <CFormSelect size="sm" value={mimeFilter} onChange={e => { setMimeFilter(e.target.value); setPage(1) }}>
                <option value="all">All files</option>
                <option value="image">Images only</option>
                <option value="video">Videos only</option>
                <option value="document">Documents</option>
              </CFormSelect>
            </CCol>
            <CCol md={2} className="d-flex align-items-center gap-2">
              <label className="small d-flex align-items-center gap-1" style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />
                Select all
              </label>
            </CCol>
          </CRow>

          {bulkError && <CAlert color="danger" className="py-2 small">{bulkError}</CAlert>}
          {isLoading && <div className="text-center py-5"><CSpinner color="primary" /></div>}
          {isError && <CAlert color="danger">Failed to load media.</CAlert>}

          {!isLoading && !isError && (
            <>
              {displayedMedia.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <CIcon icon={cilImage} style={{ width: 40, height: 40, opacity: 0.3 }} />
                  <div className="mt-2 small">{brokenOnly ? 'No broken images detected on this page.' : 'No media found.'}</div>
                </div>
              ) : layout === 'tiles' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {displayedMedia.map(item => (
                    <MediaCard
                      key={item.id} item={item}
                      selected={selected.has(item.id)}
                      onSelect={toggleSelect} onClick={setSidebarItem}
                      onMarkBroken={markBroken} brokenIds={brokenIds}
                    />
                  ))}
                </div>
              ) : (
                <CTable hover responsive small>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell style={{ width: 36 }}></CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 52 }}>Thumb</CTableHeaderCell>
                      <CTableHeaderCell>Filename</CTableHeaderCell>
                      <CTableHeaderCell>Type</CTableHeaderCell>
                      <CTableHeaderCell>MIME</CTableHeaderCell>
                      <CTableHeaderCell>Size</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Uploaded By</CTableHeaderCell>
                      <CTableHeaderCell>Date</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {displayedMedia.map((item, idx) => (
                      <MediaRow
                        key={item.id} item={item} idx={idx}
                        selected={selected.has(item.id)}
                        onSelect={toggleSelect} onClick={setSidebarItem}
                        onMarkBroken={markBroken} brokenIds={brokenIds}
                      />
                    ))}
                  </CTableBody>
                </CTable>
              )}

              <div className="mt-3">
                <AdminTableFooter
                  total={data?.total || 0}
                  page={page} pageSize={pageSize}
                  onPageChange={(p) => { setPage(p); setSelected(new Set()) }}
                  onPageSizeChange={(s) => { setPageSize(s); setPage(1); setSelected(new Set()) }}
                />
              </div>
            </>
          )}
        </CCardBody>
      </CCard>

      <MediaSidebar
        item={sidebarItem} brokenIds={brokenIds}
        onClose={() => { setSidebarItem(null); document.body.style.overflow = '' }}
        onDelete={(id) => deleteMut.mutate(id)}
        onToggleApproval={(id, isApproved) => approvalMut.mutate({ id, isApproved })}
        deleting={deleteMut.isLoading && deleteMut.variables === sidebarItem?.id}
      />
    </>
  )
}

export default MediaLibrary
