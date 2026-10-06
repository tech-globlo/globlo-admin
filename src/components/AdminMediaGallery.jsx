import React, { useState, useEffect, useCallback } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import {
  CBadge, CButton, CSpinner, CAlert,
  COffcanvas, COffcanvasHeader, COffcanvasTitle, COffcanvasBody,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CRow, CCol,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash, cilImage, cilFile, cilExternalLink, cilX, cilViewModule, cilList } from '@coreui/icons'
import api from '../lib/api'
import { fmtDate } from '../lib/dateUtils'

const PAGE_SIZE = 20

const TYPE_META = {
  TRIP_COVER:      { label: 'Cover',     color: 'primary' },
  TRIP_GALLERY:    { label: 'Gallery',   color: 'success' },
  TRIP_HIGHLIGHT:  { label: 'Highlight', color: 'warning' },
  PORTFOLIO:       { label: 'Portfolio', color: 'info' },
  DESTINATION_PHOTO: { label: 'Destination', color: 'secondary' },
}

const fmtBytes = (b) => {
  if (!b) return '-'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(2)} MB`
}
const getFilename = (m) => m.metadata?.originalFilename || m.key?.split('/').pop() || '-'

const STATUS_COLOR = { READY: 'success', PROCESSING: 'warning', REJECTED: 'danger', FAILED: 'danger' }

// -- Tile card ----------------------------------------------------------------
const MediaTile = ({ item, onClick, onDelete, deleting, showTypeLabel, brokenIds, onMarkBroken }) => {
  const isBroken = brokenIds.has(item.id)
  const isImage = item.mimeType?.startsWith('image/')
  const typeMeta = TYPE_META[item.type]

  return (
    <div
      style={{
        position: 'relative', borderRadius: 6, overflow: 'hidden',
        aspectRatio: '1', background: '#1a1a2e', cursor: 'pointer',
      }}
      onClick={() => onClick(item)}
    >
      {isImage && !isBroken ? (
        <img
          src={item.thumbUrl || item.url}
          alt={getFilename(item)}
          loading="lazy"
          onError={() => onMarkBroken(item.id)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: isBroken ? '#dc3545' : '#666' }}>
          <CIcon icon={isBroken ? cilImage : cilFile} style={{ width: 28, height: 28 }} />
          {!isBroken && (
            <div style={{ fontSize: 10, marginTop: 4, textAlign: 'center', padding: '0 6px', wordBreak: 'break-all' }}>
              {item.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
            </div>
          )}
        </div>
      )}

      {/* Type label badge */}
      {showTypeLabel && typeMeta && (
        <div style={{ position: 'absolute', top: 5, left: 5, zIndex: 10 }}>
          <CBadge color={typeMeta.color} style={{ fontSize: 9, opacity: 0.92 }}>{typeMeta.label}</CBadge>
        </div>
      )}

      {/* Delete button */}
      <div
        style={{ position: 'absolute', top: 5, right: 5, zIndex: 10 }}
        onClick={(e) => { e.stopPropagation(); window.confirm(`Delete "${getFilename(item)}"?`) && onDelete(item.id) }}
      >
        <CButton
          size="sm"
          color="danger"
          style={{ padding: '2px 5px', opacity: 0.85, lineHeight: 1 }}
          disabled={deleting === item.id}
        >
          {deleting === item.id
            ? <CSpinner size="sm" style={{ width: 10, height: 10, color: '#fff' }} />
            : <CIcon icon={cilTrash} style={{ width: 10, height: 10, color: '#fff' }} />
          }
        </CButton>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', padding: '12px 5px 4px', fontSize: 10, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {getFilename(item)}
      </div>
    </div>
  )
}

// -- List row ----------------------------------------------------------------
const MediaListRow = ({ item, onClick, onDelete, deleting, showTypeLabel, brokenIds, onMarkBroken }) => {
  const isBroken = brokenIds.has(item.id)
  const isImage = item.mimeType?.startsWith('image/')
  const typeMeta = TYPE_META[item.type]

  return (
    <CTableRow style={{ cursor: 'pointer' }} onClick={() => onClick(item)}>
      <CTableDataCell>
        <div style={{ width: 40, height: 40, borderRadius: 4, overflow: 'hidden', background: '#1a1a2e' }}>
          {isImage && !isBroken ? (
            <img
              src={item.thumbUrl || item.url} alt="" loading="lazy"
              onError={() => onMarkBroken(item.id)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CIcon icon={isBroken ? cilImage : cilFile} style={{ width: 18, height: 18, color: isBroken ? '#dc3545' : '#666' }} />
            </div>
          )}
        </div>
      </CTableDataCell>
      <CTableDataCell className="small" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {getFilename(item)}
      </CTableDataCell>
      {showTypeLabel && (
        <CTableDataCell>
          {typeMeta
            ? <CBadge color={typeMeta.color} style={{ fontSize: 10 }}>{typeMeta.label}</CBadge>
            : <span className="small text-muted">{item.type}</span>
          }
        </CTableDataCell>
      )}
      <CTableDataCell className="small text-muted">{item.width && item.height ? `${item.width}×${item.height}` : '-'}</CTableDataCell>
      <CTableDataCell className="small text-muted">{fmtBytes(item.size)}</CTableDataCell>
      <CTableDataCell>
        <CBadge color={STATUS_COLOR[item.status] || 'secondary'} style={{ fontSize: 10 }}>{item.status}</CBadge>
      </CTableDataCell>
      <CTableDataCell className="small text-muted">{fmtDate(item.createdAt)}</CTableDataCell>
      <CTableDataCell>
        <CButton
          size="sm" color="outline-danger"
          style={{ padding: '2px 7px' }}
          disabled={deleting === item.id}
          onClick={(e) => { e.stopPropagation(); window.confirm(`Delete "${getFilename(item)}"?`) && onDelete(item.id) }}
        >
          {deleting === item.id ? <CSpinner size="sm" /> : <CIcon icon={cilTrash} size="sm" />}
        </CButton>
      </CTableDataCell>
    </CTableRow>
  )
}

// -- Detail offcanvas --------------------------------------------------------
const MediaDetail = ({ item, onClose, onDelete, deleting, brokenIds }) => {
  if (!item) return null
  const isBroken = brokenIds.has(item.id)
  const isImage = item.mimeType?.startsWith('image/')
  const isVideo = item.mimeType?.startsWith('video/')
  const isPdf = item.mimeType === 'application/pdf'
  const filename = getFilename(item)
  const typeMeta = TYPE_META[item.type]

  return (
    <COffcanvas placement="end" visible={!!item} onHide={onClose} scroll backdrop={false} style={{ width: 480 }}>
      <COffcanvasHeader style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
        <COffcanvasTitle className="small fw-semibold text-truncate" style={{ maxWidth: 380 }}>{filename}</COffcanvasTitle>
        <CButton color="link" className="p-0 ms-auto" onClick={onClose}>
          <CIcon icon={cilX} size="sm" />
        </CButton>
      </COffcanvasHeader>
      <COffcanvasBody>
        <CRow className="g-3">
          {/* Left col — preview */}
          <CCol md={6}>
            <div style={{ background: '#111', borderRadius: 6, overflow: 'hidden', aspectRatio: isPdf ? '3 / 4' : '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isImage && !isBroken ? (
                <img
                  src={item.url} alt={filename}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : isVideo ? (
                <video src={item.url} controls style={{ width: '100%', borderRadius: 4 }} />
              ) : isPdf ? (
                <iframe
                  src={item.url}
                  title={filename}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#666' }}>
                  <CIcon icon={isBroken ? cilImage : cilFile} style={{ width: 40, height: 40 }} />
                  {!isBroken && (
                    <div className="small mt-1">{item.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}</div>
                  )}
                </div>
              )}
            </div>
            {!isImage && (
              <div className="mt-2 text-center">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="small">
                  <CIcon icon={cilExternalLink} className="me-1" size="sm" />
                  Open {isPdf ? 'PDF' : isVideo ? 'video' : 'file'} in new tab
                </a>
              </div>
            )}
            {typeMeta && (
              <div className="mt-2 text-center">
                <CBadge color={typeMeta.color}>{typeMeta.label}</CBadge>
              </div>
            )}
          </CCol>

          {/* Right col — metadata */}
          <CCol md={6}>
            <div className="d-flex flex-wrap gap-1 mb-3">
              <CBadge color={STATUS_COLOR[item.status] || 'secondary'}>{item.status}</CBadge>
              {!typeMeta && <CBadge color="light" textColor="dark" className="border">{item.type}</CBadge>}
            </div>

            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Filename',   filename],
                  ['MIME',       item.mimeType || '-'],
                  ['Size',       fmtBytes(item.size)],
                  ['Dimensions', item.width && item.height ? `${item.width} × ${item.height} px` : '-'],
                  ['Uploaded',   fmtDate(item.createdAt)],
                  ['Uploader',   item.user?.name || '-'],
                  ['Trip',       item.trip?.title || '-'],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                    <td style={{ padding: '5px 0', color: 'var(--cui-secondary-color)', minWidth: 80 }}>{label}</td>
                    <td style={{ padding: '5px 0 5px 8px', wordBreak: 'break-all', fontWeight: 500 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3">
              <div className="small fw-semibold text-muted mb-1">Storage key</div>
              <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 10, background: 'var(--cui-tertiary-bg)', padding: '4px 6px', borderRadius: 4 }}>
                {item.key}
              </div>
            </div>

            <div className="mt-3">
              <CButton
                color="danger" size="sm" className="w-100"
                disabled={deleting === item.id}
                onClick={() => window.confirm(`Delete "${filename}"?`) && onDelete(item.id)}
              >
                {deleting === item.id ? <CSpinner size="sm" className="me-1" style={{ color: '#fff' }} /> : <CIcon icon={cilTrash} className="me-1" size="sm" style={{ color: '#fff' }} />}
                Delete Permanently
              </CButton>
            </div>
          </CCol>
        </CRow>
      </COffcanvasBody>
    </COffcanvas>
  )
}

// -- Main component ----------------------------------------------------------
/**
 * Reusable media gallery panel for use inside UserDetail and TripDetail.
 * Props:
 *   userId    — filter by uploader userId
 *   tripId    — filter by tripId
 *   cacheKey  — unique string used as part of react-query key (e.g. "user-gallery-<id>")
 *   showTypeLabel — show type badge on tiles/rows (auto-true when tripId is set)
 */
const AdminMediaGallery = ({ userId, tripId, cacheKey, showTypeLabel }) => {
  const qc = useQueryClient()
  const shouldShowType = showTypeLabel || !!tripId

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [hasMore, setHasMore] = useState(false)

  const [layout, setLayout] = useState('tiles')
  const [detailItem, setDetailItem] = useState(null)
  const [brokenIds, setBrokenIds] = useState(new Set())
  const [deleting, setDeleting] = useState(null)

  const markBroken = useCallback((id) => setBrokenIds(p => new Set(p).add(id)), [])

  const fetchPage = useCallback(async (currentOffset, reset) => {
    setLoading(true)
    setLoadError(null)
    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE, offset: currentOffset, sortBy: 'createdAt', sortOrder: 'desc' })
      if (userId) params.set('userId', userId)
      if (tripId) params.set('tripId', tripId)
      const res = await api.get(`/api/admin/media?${params}`)
      const data = res.data.data
      setTotal(data.total)
      if (reset) {
        setItems(data.media)
      } else {
        setItems(prev => [...prev, ...data.media])
      }
      const newOffset = currentOffset + data.media.length
      setOffset(newOffset)
      setHasMore(newOffset < data.total)
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load media.')
    } finally {
      setLoading(false)
    }
  }, [userId, tripId])

  // Reset and fetch on mount or filter change
  useEffect(() => {
    setItems([])
    setOffset(0)
    setTotal(0)
    setHasMore(false)
    fetchPage(0, true)
  }, [userId, tripId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await api.delete(`/api/admin/media/${id}`)
      setItems(prev => prev.filter(m => m.id !== id))
      setTotal(prev => prev - 1)
      if (detailItem?.id === id) setDetailItem(null)
      qc.invalidateQueries({ queryKey: ['admin-media'] })
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <span className="small text-muted">{total} item{total !== 1 ? 's' : ''}</span>
        <div className="ms-auto d-flex gap-1">
          <CButton
            size="sm"
            color={layout === 'tiles' ? 'primary' : 'outline-secondary'}
            onClick={() => setLayout('tiles')}
            style={{ padding: '3px 8px' }}
            title="Grid view"
          >
            <CIcon icon={cilViewModule} size="sm" />
          </CButton>
          <CButton
            size="sm"
            color={layout === 'list' ? 'primary' : 'outline-secondary'}
            onClick={() => setLayout('list')}
            style={{ padding: '3px 8px' }}
            title="List view"
          >
            <CIcon icon={cilList} size="sm" />
          </CButton>
        </div>
      </div>

      {loadError && <CAlert color="danger" className="py-2 small">{loadError}</CAlert>}

      {items.length === 0 && !loading && (
        <div className="text-center py-5 text-muted">
          <CIcon icon={cilImage} style={{ width: 36, height: 36, opacity: 0.3 }} />
          <div className="small mt-2">No media found.</div>
        </div>
      )}

      {layout === 'tiles' && items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {items.map(item => (
            <MediaTile
              key={item.id}
              item={item}
              onClick={setDetailItem}
              onDelete={handleDelete}
              deleting={deleting}
              showTypeLabel={shouldShowType}
              brokenIds={brokenIds}
              onMarkBroken={markBroken}
            />
          ))}
        </div>
      )}

      {layout === 'list' && items.length > 0 && (
        <CTable hover responsive small>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell style={{ width: 52 }}>Thumb</CTableHeaderCell>
              <CTableHeaderCell>Filename</CTableHeaderCell>
              {shouldShowType && <CTableHeaderCell>Type</CTableHeaderCell>}
              <CTableHeaderCell>Dimensions</CTableHeaderCell>
              <CTableHeaderCell>Size</CTableHeaderCell>
              <CTableHeaderCell>Status</CTableHeaderCell>
              <CTableHeaderCell>Date</CTableHeaderCell>
              <CTableHeaderCell style={{ width: 60 }}>Action</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {items.map(item => (
              <MediaListRow
                key={item.id}
                item={item}
                onClick={setDetailItem}
                onDelete={handleDelete}
                deleting={deleting}
                showTypeLabel={shouldShowType}
                brokenIds={brokenIds}
                onMarkBroken={markBroken}
              />
            ))}
          </CTableBody>
        </CTable>
      )}

      {/* Load more / spinner */}
      <div className="text-center mt-3">
        {loading && <CSpinner size="sm" color="primary" />}
        {!loading && hasMore && (
          <CButton size="sm" color="outline-primary" onClick={() => fetchPage(offset, false)}>
            Load more ({total - offset} remaining)
          </CButton>
        )}
        {!loading && !hasMore && items.length > 0 && (
          <div className="small text-muted">All {total} item{total !== 1 ? 's' : ''} loaded</div>
        )}
      </div>

      <MediaDetail
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onDelete={handleDelete}
        deleting={deleting}
        brokenIds={brokenIds}
      />
    </>
  )
}

export default AdminMediaGallery
