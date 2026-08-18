import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CBadge,
  CButton,
  CSpinner,
  CAlert,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CFormInput,
  CFormSelect,
  CFormCheck,
  CFormTextarea,
  CListGroup,
  CListGroupItem,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPencil,
  cilCheck,
  cilX,
  cilArrowLeft,
  cilStar,
  cilTrash,
  cilCloudUpload,
  cilLink,
} from '@coreui/icons'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

//
const fmtPrice = (minor) => {
  if (minor == null) return '-'
  return '₹' + (Number(minor) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

// photographyFriendly is stored as a JSON-encoded string: { level, compositions?, recommendedGear?, tip? }.
// Some legacy rows may still hold a bare level string ("High"/"Medium"/"Low") — fall back gracefully.
const parsePhotographyFriendly = (raw) => {
  if (!raw) return { level: 'Medium', compositions: [], recommendedGear: [], tip: '' }
  if (typeof raw === 'object') {
    return {
      level: raw.level || 'Medium',
      compositions: raw.compositions || [],
      recommendedGear: raw.recommendedGear || [],
      tip: raw.tip || '',
    }
  }
  try {
    const parsed = JSON.parse(raw)
    return {
      level: parsed.level || 'Medium',
      compositions: parsed.compositions || [],
      recommendedGear: parsed.recommendedGear || [],
      tip: parsed.tip || '',
    }
  } catch {
    // Legacy plain-string value
    return { level: raw, compositions: [], recommendedGear: [], tip: '' }
  }
}
const TRIP_STATUS_COLOR = {
  ACTIVE: 'success',
  RUNNING: 'info',
  DRAFT: 'secondary',
  COMPLETED: 'dark',
  CANCELLED: 'danger',
}

const InfoRow = ({ label, value }) => (
  <CListGroupItem className="d-flex justify-content-between align-items-start py-2 px-0 border-start-0 border-end-0">
    <span className="text-muted small">{label}</span>
    <span
      className="small fw-semibold text-end"
      style={{ maxWidth: '65%', wordBreak: 'break-word' }}
    >
      {value ?? '-'}
    </span>
  </CListGroupItem>
)

// Renders a comma-separated list of values as chips instead of a plain joined string
const ChipsRow = ({ label, values }) => (
  <CListGroupItem className="d-flex justify-content-between align-items-start py-2 px-0 border-start-0 border-end-0">
    <span className="text-muted small">{label}</span>
    <div className="d-flex flex-wrap gap-1 justify-content-end" style={{ maxWidth: '65%' }}>
      {values && values.length > 0 ? (
        values.map((v) => (
          <CBadge key={v} color="light" textColor="dark" className="border fw-normal">
            {v}
          </CBadge>
        ))
      ) : (
        <span className="small fw-semibold">-</span>
      )}
    </div>
  </CListGroupItem>
)

const EditRow = ({ label, children }) => (
  <div className="mb-3">
    <label className="form-label small fw-semibold">{label}</label>
    {children}
  </div>
)

// Tab-level edit toolbar
const EditBar = ({ editing, onEdit, onSave, onCancel, saving }) => (
  <div className="d-flex justify-content-end mb-3">
    {!editing ? (
      <CButton size="sm" color="outline-primary" onClick={onEdit}>
        <CIcon icon={cilPencil} className="me-1" size="sm" />
        Edit
      </CButton>
    ) : (
      <div className="d-flex gap-2">
        <CButton size="sm" color="outline-secondary" onClick={onCancel} disabled={saving}>
          <CIcon icon={cilX} className="me-1" size="sm" />
          Cancel
        </CButton>
        <CButton size="sm" color="primary" onClick={onSave} disabled={saving}>
          {saving ? (
            <CSpinner size="sm" className="me-1" />
          ) : (
            <CIcon icon={cilCheck} className="me-1" size="sm" />
          )}
          Save
        </CButton>
      </div>
    )}
  </div>
)

const DestinationDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('info')

  // per-tab editing state
  const [editing, setEditing] = useState({})
  const [forms, setForms] = useState({})
  const [tabError, setTabError] = useState({})
  const [tabSuccess, setTabSuccess] = useState({})

  const [lightbox, setLightbox] = useState(null)

  // Gallery state
  const [galleryAddMode, setGalleryAddMode] = useState(null) // null | 'upload' | 'url'
  const [galleryUrlInput, setGalleryUrlInput] = useState('')
  const [galleryFile, setGalleryFile] = useState(null)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [galleryError, setGalleryError] = useState(null)
  const [galleryDeleting, setGalleryDeleting] = useState(null) // url being deleted

  const {
    data: dest,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-destination', id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/destinations/${id}`)
      return res.data.data
    },
  })

  // Initialise form data from destination
  useEffect(() => {
    if (!dest) return
    setForms({
      info: {
        name: dest.name || '',
        country: dest.country || '',
        state: dest.state || '',
        region: dest.region || '',
        description: dest.description || '',
        latitude: dest.latitude ?? '',
        longitude: dest.longitude ?? '',
        isPopular: dest.isPopular || false,
      },
      nature: {
        photographyLevel: parsePhotographyFriendly(dest.photographyFriendly).level,
        photographyCompositions: parsePhotographyFriendly(
          dest.photographyFriendly,
        ).compositions.join(', '),
        photographyRecommendedGear: parsePhotographyFriendly(
          dest.photographyFriendly,
        ).recommendedGear.join(', '),
        photographyTip: parsePhotographyFriendly(dest.photographyFriendly).tip,
        photographyPermits: dest.photographyPermits || '',
        category: (dest.category || []).join(', '),
        species: (dest.species || []).join(', '),
        conservationStatus: (dest.conservationStatus || []).join(', '),
      },
      access: {
        openTime: dest.openTime || '',
        vehicleAccess: dest.vehicleAccess || '',
        crowdLevel: dest.crowdLevel || '',
        availableFeatures: (dest.availableFeatures || []).join(', '),
        bestTimeToVisit: (dest.bestTimeToVisit || []).join(', '),
        tags: (dest.tags || []).join(', '),
      },
    })
  }, [dest])

  const saveMut = useMutation({
    mutationFn: (payload) => api.patch(`/api/admin/destinations/${id}`, payload),
    onSuccess: (_, __, tab) => {
      qc.invalidateQueries({ queryKey: ['admin-destination', id] })
      qc.invalidateQueries({ queryKey: ['admin-destinations'] })
      setEditing((e) => ({ ...e, [tab]: false }))
      setTabSuccess((s) => ({ ...s, [tab]: 'Saved.' }))
      setTimeout(() => setTabSuccess((s) => ({ ...s, [tab]: null })), 3000)
    },
    onError: (err, _, tab) => {
      setTabError((e) => ({ ...e, [tab]: err.response?.data?.message || 'Save failed.' }))
    },
  })

  const startEdit = (tab) => {
    setTabError((e) => ({ ...e, [tab]: null }))
    setEditing((e) => ({ ...e, [tab]: true }))
  }

  const cancelEdit = (tab) => {
    setEditing((e) => ({ ...e, [tab]: false }))
    setTabError((e) => ({ ...e, [tab]: null }))
    if (!dest) return
    setForms((f) => ({
      ...f,
      info: {
        name: dest.name || '',
        country: dest.country || '',
        state: dest.state || '',
        region: dest.region || '',
        description: dest.description || '',
        latitude: dest.latitude ?? '',
        longitude: dest.longitude ?? '',
        isPopular: dest.isPopular || false,
      },
      nature: {
        photographyLevel: parsePhotographyFriendly(dest.photographyFriendly).level,
        photographyCompositions: parsePhotographyFriendly(
          dest.photographyFriendly,
        ).compositions.join(', '),
        photographyRecommendedGear: parsePhotographyFriendly(
          dest.photographyFriendly,
        ).recommendedGear.join(', '),
        photographyTip: parsePhotographyFriendly(dest.photographyFriendly).tip,
        photographyPermits: dest.photographyPermits || '',
        category: (dest.category || []).join(', '),
        species: (dest.species || []).join(', '),
        conservationStatus: (dest.conservationStatus || []).join(', '),
      },
      access: {
        openTime: dest.openTime || '',
        vehicleAccess: dest.vehicleAccess || '',
        crowdLevel: dest.crowdLevel || '',
        availableFeatures: (dest.availableFeatures || []).join(', '),
        bestTimeToVisit: (dest.bestTimeToVisit || []).join(', '),
        tags: (dest.tags || []).join(', '),
      },
    }))
  }

  const saveTab = (tab) => {
    const f = forms[tab]
    let payload = {}
    if (tab === 'info') {
      payload = {
        name: f.name,
        country: f.country,
        state: f.state || undefined,
        region: f.region || undefined,
        description: f.description,
        latitude: f.latitude !== '' ? parseFloat(f.latitude) : undefined,
        longitude: f.longitude !== '' ? parseFloat(f.longitude) : undefined,
        isPopular: f.isPopular,
      }
    } else if (tab === 'nature') {
      payload = {
        photographyFriendly: JSON.stringify({
          level: f.photographyLevel,
          compositions: f.photographyCompositions
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          recommendedGear: f.photographyRecommendedGear
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          tip: f.photographyTip || undefined,
        }),
        photographyPermits: f.photographyPermits || undefined,
        category: f.category
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        species: f.species
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        conservationStatus: f.conservationStatus
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
    } else if (tab === 'access') {
      payload = {
        openTime: f.openTime || undefined,
        vehicleAccess: f.vehicleAccess || undefined,
        crowdLevel: f.crowdLevel || undefined,
        availableFeatures: f.availableFeatures
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        bestTimeToVisit: f.bestTimeToVisit
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        tags: f.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
    }
    saveMut.mutate(payload, {
      onError: (err) =>
        setTabError((e) => ({ ...e, [tab]: err.response?.data?.message || 'Save failed.' })),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['admin-destination', id] })
        setEditing((e) => ({ ...e, [tab]: false }))
        setTabSuccess((s) => ({ ...s, [tab]: 'Saved.' }))
        setTimeout(() => setTabSuccess((s) => ({ ...s, [tab]: null })), 3000)
      },
    })
  }

  const setField = (tab, key, val) => setForms((f) => ({ ...f, [tab]: { ...f[tab], [key]: val } }))

  const handleGalleryDelete = async (url) => {
    if (!window.confirm('Remove this image from the gallery?')) return
    setGalleryDeleting(url)
    setGalleryError(null)
    try {
      await api.delete(`/api/admin/destinations/${id}/gallery`, { data: { url } })
      qc.invalidateQueries({ queryKey: ['admin-destination', id] })
    } catch (e) {
      setGalleryError(e.response?.data?.message || 'Failed to delete image.')
    } finally {
      setGalleryDeleting(null)
    }
  }

  const handleGalleryUpload = async () => {
    if (!galleryFile) return
    setGalleryUploading(true)
    setGalleryError(null)
    try {
      // Read dimensions
      const dims = await new Promise((resolve) => {
        const img = new Image()
        const objUrl = URL.createObjectURL(galleryFile)
        img.onload = () => {
          URL.revokeObjectURL(objUrl)
          resolve({ width: img.naturalWidth, height: img.naturalHeight })
        }
        img.onerror = () => {
          URL.revokeObjectURL(objUrl)
          resolve({})
        }
        img.src = objUrl
      })

      // Read file as base64 DataURL and send to backend (avoids S3 CORS on browser PUT)
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(galleryFile)
      })

      await api.post(`/api/admin/destinations/${id}/gallery/upload`, {
        dataUrl,
        filename: galleryFile.name,
        mimeType: galleryFile.type,
        ...dims,
      })
      qc.invalidateQueries({ queryKey: ['admin-destination', id] })
      setGalleryFile(null)
      setGalleryAddMode(null)
    } catch (e) {
      setGalleryError(e.response?.data?.message || 'Upload failed.')
    } finally {
      setGalleryUploading(false)
    }
  }

  const handleGalleryImportUrl = async () => {
    if (!galleryUrlInput.trim()) return
    setGalleryUploading(true)
    setGalleryError(null)
    try {
      await api.post(`/api/admin/destinations/${id}/gallery/import-url`, {
        sourceUrl: galleryUrlInput.trim(),
      })
      qc.invalidateQueries({ queryKey: ['admin-destination', id] })
      setGalleryUrlInput('')
      setGalleryAddMode(null)
    } catch (e) {
      setGalleryError(e.response?.data?.message || 'Import failed.')
    } finally {
      setGalleryUploading(false)
    }
  }

  if (isLoading)
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  if (isError || !dest) return <CAlert color="danger">Failed to load destination.</CAlert>

  const avgRating = dest.reviews?.length
    ? (dest.reviews.reduce((s, r) => s + r.rating, 0) / dest.reviews.length).toFixed(1)
    : dest.rating?.toFixed(1)

  const TABS = [
    { key: 'info', label: 'Info' },
    { key: 'nature', label: 'Nature & Wildlife' },
    { key: 'access', label: 'Access & Logistics' },
    // Only a minority of destinations have gate data sourced — hide the tab
    // entirely rather than show an always-empty one for the rest.
    ...(dest.gates?.length > 0 ? [{ key: 'gates', label: `Gates (${dest.gates.length})` }] : []),
    { key: 'gallery', label: `Gallery (${dest.photoGallery?.length ?? 0})` },
    { key: 'trips', label: `Trips (${dest._count?.trips ?? 0})` },
    { key: 'reviews', label: `Reviews (${dest._count?.reviews ?? 0})` },
  ]

  const f = (tab) => forms[tab] || {}
  const isEditing = (tab) => !!editing[tab]
  const isSaving = saveMut.isLoading

  return (
    <>
      <CCard className="mb-4">
        <CCardBody>
          <CButton
            color="link"
            className="p-0 mb-3 text-muted small d-block"
            onClick={() => navigate(-1)}
          >
            <CIcon icon={cilArrowLeft} className="me-1" size="sm" />
            Back
          </CButton>
          <div className="d-flex align-items-start gap-3 flex-wrap">
            {/* Cover thumbnail */}
            {dest.photoGallery?.[0] ? (
              <img
                src={dest.photoGallery[0]}
                alt=""
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  background: '#321fdb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 28,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {dest.name?.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-grow-1 min-w-0">
              <h5 className="mb-1 fw-bold">{dest.name}</h5>
              <div className="small text-muted mb-2">
                {[dest.country, dest.state, dest.region].filter(Boolean).join(' - ')}
              </div>
              <div className="d-flex flex-wrap gap-2">
                {dest.isPopular && <CBadge color="success">Popular</CBadge>}
                <CBadge color="light" textColor="dark">
                  {parsePhotographyFriendly(dest.photographyFriendly).level} Photography
                </CBadge>
                {avgRating && (
                  <CBadge color="warning" textColor="dark">
                    <CIcon icon={cilStar} size="sm" className="me-1" />
                    {avgRating}
                  </CBadge>
                )}
                {(dest.tags || []).slice(0, 4).map((t) => (
                  <CBadge key={t} color="light" textColor="dark" className="border">
                    {t}
                  </CBadge>
                ))}
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="d-flex flex-wrap border-top mt-3 pt-3" style={{ gap: 0 }}>
            {[
              { label: 'Trips', value: dest._count?.trips, color: 'primary' },
              { label: 'Reviews', value: dest._count?.reviews, color: 'warning' },
              { label: 'Hotspots', value: dest._count?.hotspots, color: 'info' },
              { label: 'Gates', value: dest._count?.gates, color: 'info' },
              { label: 'Sightings', value: dest._count?.sightings, color: 'success' },
              { label: 'Wishlisted', value: dest._count?.wishlistedBy, color: 'secondary' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center px-3 py-2 border-end">
                <div className={`fw-bold fs-5 text-${color}`}>{value ?? 0}</div>
                <div className="small text-muted">{label}</div>
              </div>
            ))}
            <div className="text-center px-3 py-2">
              <div className="fw-bold fs-5 text-muted">{fmtDate(dest.createdAt)}</div>
              <div className="small text-muted">Added</div>
            </div>
          </div>
        </CCardBody>
      </CCard>

      <CCard>
        <CCardHeader className="pb-0">
          <CNav variant="underline-border">
            {TABS.map(({ key, label }) => (
              <CNavItem key={key}>
                <CNavLink
                  active={activeTab === key}
                  onClick={() => setActiveTab(key)}
                  style={{ cursor: 'pointer' }}
                >
                  {label}
                </CNavLink>
              </CNavItem>
            ))}
          </CNav>
        </CCardHeader>

        <CCardBody>
          <CTabContent>
            <CTabPane visible={activeTab === 'info'}>
              {tabError.info && (
                <CAlert color="danger" className="py-2 small">
                  {tabError.info}
                </CAlert>
              )}
              {tabSuccess.info && (
                <CAlert color="success" className="py-2 small">
                  {tabSuccess.info}
                </CAlert>
              )}
              <EditBar
                editing={isEditing('info')}
                onEdit={() => startEdit('info')}
                onSave={() => saveTab('info')}
                onCancel={() => cancelEdit('info')}
                saving={isSaving}
              />

              {!isEditing('info') ? (
                <CRow>
                  <CCol md={6}>
                    <CListGroup flush>
                      <InfoRow label="ID" value={<code className="small">{dest.id}</code>} />
                      <InfoRow label="Name" value={dest.name} />
                      <InfoRow label="Country" value={dest.country} />
                      <InfoRow label="State" value={dest.state} />
                      <InfoRow label="Region" value={dest.region} />
                    </CListGroup>
                  </CCol>
                  <CCol md={6}>
                    <CListGroup flush>
                      <InfoRow label="Latitude" value={dest.latitude} />
                      <InfoRow label="Longitude" value={dest.longitude} />
                      <InfoRow label="Popular" value={dest.isPopular ? 'Yes' : 'No'} />
                      <InfoRow
                        label="Rating"
                        value={
                          dest.rating ? (
                            <>
                              <CIcon icon={cilStar} size="sm" className="me-1" />
                              {dest.rating}
                            </>
                          ) : null
                        }
                      />
                      <InfoRow label="Added" value={fmtDate(dest.createdAt)} />
                    </CListGroup>
                  </CCol>
                  {dest.description && (
                    <CCol md={12}>
                      <div className="mt-3 p-3 bg-body-secondary rounded small">
                        <div className="fw-semibold text-muted mb-1">Description</div>
                        {dest.description}
                      </div>
                    </CCol>
                  )}
                  <CCol md={12}>
                    <div className="mt-3 p-3 border rounded">
                      <div
                        className="small fw-semibold text-uppercase text-muted mb-2"
                        style={{ letterSpacing: '0.03em' }}
                      >
                        Stats
                      </div>
                      <CListGroup flush>
                        <InfoRow label="Min Trip Price" value={fmtPrice(dest.minTripPriceMinor)} />
                        <InfoRow label="Avg Trip Price" value={fmtPrice(dest.avgTripPriceMinor)} />
                        <InfoRow label="Trips" value={dest.tripsCount ?? 0} />
                        <InfoRow label="Service Providers" value={dest.providersCount ?? 0} />
                        <InfoRow label="Wishlisted" value={dest.wishlistCount ?? 0} />
                        <InfoRow label="Sightings" value={dest.sightingCount ?? 0} />
                        <InfoRow label="Reviews" value={dest.reviewCount ?? 0} />
                      </CListGroup>
                    </div>
                  </CCol>
                </CRow>
              ) : (
                <CRow className="g-3">
                  <CCol md={6}>
                    <EditRow label="Name *">
                      <CFormInput
                        size="sm"
                        value={f('info').name}
                        onChange={(e) => setField('info', 'name', e.target.value)}
                      />
                    </EditRow>
                  </CCol>
                  <CCol md={3}>
                    <EditRow label="Country *">
                      <CFormInput
                        size="sm"
                        value={f('info').country}
                        onChange={(e) => setField('info', 'country', e.target.value)}
                      />
                    </EditRow>
                  </CCol>
                  <CCol md={3}>
                    <EditRow label="State">
                      <CFormInput
                        size="sm"
                        value={f('info').state}
                        onChange={(e) => setField('info', 'state', e.target.value)}
                      />
                    </EditRow>
                  </CCol>
                  <CCol md={3}>
                    <EditRow label="Region">
                      <CFormInput
                        size="sm"
                        value={f('info').region}
                        onChange={(e) => setField('info', 'region', e.target.value)}
                      />
                    </EditRow>
                  </CCol>
                  <CCol md={3}>
                    <EditRow label="Latitude">
                      <CFormInput
                        size="sm"
                        type="number"
                        step="any"
                        value={f('info').latitude}
                        onChange={(e) => setField('info', 'latitude', e.target.value)}
                      />
                    </EditRow>
                  </CCol>
                  <CCol md={3}>
                    <EditRow label="Longitude">
                      <CFormInput
                        size="sm"
                        type="number"
                        step="any"
                        value={f('info').longitude}
                        onChange={(e) => setField('info', 'longitude', e.target.value)}
                      />
                    </EditRow>
                  </CCol>
                  <CCol md={3} className="d-flex align-items-center">
                    <CFormCheck
                      label="Mark as Popular"
                      checked={f('info').isPopular}
                      onChange={(e) => setField('info', 'isPopular', e.target.checked)}
                      className="mt-3"
                    />
                  </CCol>
                  <CCol md={12}>
                    <EditRow label="Description *">
                      <CFormTextarea
                        rows={4}
                        value={f('info').description}
                        onChange={(e) => setField('info', 'description', e.target.value)}
                      />
                    </EditRow>
                  </CCol>
                </CRow>
              )}
            </CTabPane>

            <CTabPane visible={activeTab === 'nature'}>
              {tabError.nature && (
                <CAlert color="danger" className="py-2 small">
                  {tabError.nature}
                </CAlert>
              )}
              {tabSuccess.nature && (
                <CAlert color="success" className="py-2 small">
                  {tabSuccess.nature}
                </CAlert>
              )}
              <EditBar
                editing={isEditing('nature')}
                onEdit={() => startEdit('nature')}
                onSave={() => saveTab('nature')}
                onCancel={() => cancelEdit('nature')}
                saving={isSaving}
              />

              {!isEditing('nature') ? (
                <>
                  <div className="border rounded p-3 mb-3 bg-body-tertiary">
                    <div
                      className="small fw-semibold text-uppercase text-muted mb-2"
                      style={{ letterSpacing: '0.03em' }}
                    >
                      Photography Friendly
                    </div>
                    <CListGroup flush>
                      <InfoRow
                        label="Level"
                        value={parsePhotographyFriendly(dest.photographyFriendly).level}
                      />
                      <InfoRow label="Permits" value={dest.photographyPermits} />
                      <ChipsRow
                        label="Compositions"
                        values={parsePhotographyFriendly(dest.photographyFriendly).compositions}
                      />
                      <ChipsRow
                        label="Recommended Gear"
                        values={parsePhotographyFriendly(dest.photographyFriendly).recommendedGear}
                      />
                      <InfoRow
                        label="Tip"
                        value={parsePhotographyFriendly(dest.photographyFriendly).tip || null}
                      />
                    </CListGroup>
                  </div>
                  <CListGroup flush>
                    <InfoRow label="Categories" value={(dest.category || []).join(', ') || null} />
                    <ChipsRow label="Species" values={dest.species || []} />
                    <InfoRow
                      label="Conservation Status"
                      value={(dest.conservationStatus || []).join(', ') || null}
                    />
                  </CListGroup>
                </>
              ) : (
                <>
                  <div className="border rounded p-3 mb-3 bg-body-tertiary">
                    <div
                      className="small fw-semibold text-uppercase text-muted mb-3"
                      style={{ letterSpacing: '0.03em' }}
                    >
                      Photography Friendly
                    </div>
                    <CRow className="g-3">
                      <CCol md={4}>
                        <EditRow label="Level">
                          <CFormSelect
                            size="sm"
                            value={f('nature').photographyLevel}
                            onChange={(e) => setField('nature', 'photographyLevel', e.target.value)}
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </CFormSelect>
                        </EditRow>
                      </CCol>
                      <CCol md={8}>
                        <EditRow label="Permits">
                          <CFormInput
                            size="sm"
                            value={f('nature').photographyPermits}
                            onChange={(e) =>
                              setField('nature', 'photographyPermits', e.target.value)
                            }
                            placeholder="e.g. No drone, permit required."
                          />
                        </EditRow>
                      </CCol>
                      <CCol md={6}>
                        <EditRow label="Compositions (comma-separated)">
                          <CFormInput
                            size="sm"
                            value={f('nature').photographyCompositions}
                            onChange={(e) =>
                              setField('nature', 'photographyCompositions', e.target.value)
                            }
                            placeholder="Lake-and-forest landscapes, Rare-species birding."
                          />
                        </EditRow>
                      </CCol>
                      <CCol md={6}>
                        <EditRow label="Recommended Gear (comma-separated)">
                          <CFormInput
                            size="sm"
                            value={f('nature').photographyRecommendedGear}
                            onChange={(e) =>
                              setField('nature', 'photographyRecommendedGear', e.target.value)
                            }
                            placeholder="400mm+ telephoto lens, Wide-angle for lakescapes."
                          />
                        </EditRow>
                      </CCol>
                      <CCol md={12}>
                        <EditRow label="Tip">
                          <CFormTextarea
                            size="sm"
                            rows={2}
                            value={f('nature').photographyTip}
                            onChange={(e) => setField('nature', 'photographyTip', e.target.value)}
                            placeholder="A 400mm+ lens helps for shy forest mammals..."
                          />
                        </EditRow>
                      </CCol>
                    </CRow>
                  </div>
                  <CRow className="g-3">
                    <CCol md={6}>
                      <EditRow label="Categories (comma-separated)">
                        <CFormInput
                          size="sm"
                          value={f('nature').category}
                          onChange={(e) => setField('nature', 'category', e.target.value)}
                          placeholder="Wildlife, Forest, Lake."
                        />
                      </EditRow>
                    </CCol>
                    <CCol md={6}>
                      <EditRow label="Species (comma-separated)">
                        <CFormInput
                          size="sm"
                          value={f('nature').species}
                          onChange={(e) => setField('nature', 'species', e.target.value)}
                          placeholder="Tiger, Leopard, Elephant."
                        />
                      </EditRow>
                    </CCol>
                    <CCol md={12}>
                      <EditRow label="Conservation Status (comma-separated)">
                        <CFormInput
                          size="sm"
                          value={f('nature').conservationStatus}
                          onChange={(e) => setField('nature', 'conservationStatus', e.target.value)}
                          placeholder="Protected, National Park."
                        />
                      </EditRow>
                    </CCol>
                  </CRow>
                </>
              )}
            </CTabPane>

            <CTabPane visible={activeTab === 'access'}>
              {tabError.access && (
                <CAlert color="danger" className="py-2 small">
                  {tabError.access}
                </CAlert>
              )}
              {tabSuccess.access && (
                <CAlert color="success" className="py-2 small">
                  {tabSuccess.access}
                </CAlert>
              )}
              <EditBar
                editing={isEditing('access')}
                onEdit={() => startEdit('access')}
                onSave={() => saveTab('access')}
                onCancel={() => cancelEdit('access')}
                saving={isSaving}
              />

              {!isEditing('access') ? (
                <CRow>
                  <CCol md={6}>
                    <CListGroup flush>
                      <InfoRow label="Open Time" value={dest.openTime} />
                      <InfoRow label="Vehicle Access" value={dest.vehicleAccess} />
                      <InfoRow label="Crowd Level" value={dest.crowdLevel} />
                    </CListGroup>
                  </CCol>
                  <CCol md={6}>
                    <CListGroup flush>
                      <InfoRow
                        label="Best Time to Visit"
                        value={(dest.bestTimeToVisit || []).join(', ') || null}
                      />
                      <ChipsRow label="Tags" values={dest.tags || []} />
                      <ChipsRow label="Features" values={dest.availableFeatures || []} />
                    </CListGroup>
                  </CCol>
                </CRow>
              ) : (
                <CRow className="g-3">
                  <CCol md={4}>
                    <EditRow label="Open Time">
                      <CFormInput
                        size="sm"
                        value={f('access').openTime}
                        onChange={(e) => setField('access', 'openTime', e.target.value)}
                        placeholder="6:00 AM - 6:00 PM"
                      />
                    </EditRow>
                  </CCol>
                  <CCol md={4}>
                    <EditRow label="Vehicle Access">
                      <CFormInput
                        size="sm"
                        value={f('access').vehicleAccess}
                        onChange={(e) => setField('access', 'vehicleAccess', e.target.value)}
                        placeholder="All vehicles / 4WD only."
                      />
                    </EditRow>
                  </CCol>
                  <CCol md={4}>
                    <EditRow label="Crowd Level">
                      <CFormSelect
                        size="sm"
                        value={f('access').crowdLevel}
                        onChange={(e) => setField('access', 'crowdLevel', e.target.value)}
                      >
                        <option value="">- Select -</option>
                        <option value="Low">Low</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High">High</option>
                      </CFormSelect>
                    </EditRow>
                  </CCol>
                  <CCol md={6}>
                    <EditRow label="Best Time to Visit (comma-separated)">
                      <CFormInput
                        size="sm"
                        value={f('access').bestTimeToVisit}
                        onChange={(e) => setField('access', 'bestTimeToVisit', e.target.value)}
                        placeholder="Oct, Nov, Dec."
                      />
                    </EditRow>
                  </CCol>
                  <CCol md={6}>
                    <EditRow label="Tags (comma-separated)">
                      <CFormInput
                        size="sm"
                        value={f('access').tags}
                        onChange={(e) => setField('access', 'tags', e.target.value)}
                        placeholder="Wildlife, Forest."
                      />
                    </EditRow>
                  </CCol>
                  <CCol md={12}>
                    <EditRow label="Available Features (comma-separated)">
                      <CFormInput
                        size="sm"
                        value={f('access').availableFeatures}
                        onChange={(e) => setField('access', 'availableFeatures', e.target.value)}
                        placeholder="Watchtower, Guide, Parking."
                      />
                    </EditRow>
                  </CCol>
                </CRow>
              )}
            </CTabPane>

            {/* Gates — read-only for now; gate CRUD is a later phase (see
                project_admin_gates_scope memory). Only rendered when the
                destination actually has sourced gate data (TABS omits the
                tab entirely otherwise). */}
            {dest.gates?.length > 0 && (
              <CTabPane visible={activeTab === 'gates'}>
                <CTable small hover responsive>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell>Gate</CTableHeaderCell>
                      <CTableHeaderCell>Zone</CTableHeaderCell>
                      <CTableHeaderCell>District / Town</CTableHeaderCell>
                      <CTableHeaderCell>Vehicle</CTableHeaderCell>
                      <CTableHeaderCell>Rating</CTableHeaderCell>
                      <CTableHeaderCell>Popularity Rank</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {dest.gates.map((gate) => (
                      <CTableRow key={gate.id}>
                        <CTableDataCell>
                          <div className="small fw-semibold">{gate.gateName}</div>
                          {gate.isPrimary === false && (
                            <CBadge color="secondary" className="mt-1">
                              Add-on
                            </CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="small text-muted">
                          {gate.zoneType || '-'}
                        </CTableDataCell>
                        <CTableDataCell className="small text-muted">
                          {[gate.district, gate.nearbyTown].filter(Boolean).join(' · ') || '-'}
                        </CTableDataCell>
                        <CTableDataCell className="small text-muted">
                          {gate.vehicleType || '-'}
                        </CTableDataCell>
                        <CTableDataCell className="small text-muted">
                          {gate.googleRating != null ? gate.googleRating.toFixed(1) : '-'}
                        </CTableDataCell>
                        <CTableDataCell className="small text-muted">
                          {gate.popularityRank ?? '-'}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CTabPane>
            )}

            <CTabPane visible={activeTab === 'gallery'}>
              {/* Toolbar */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="small text-muted">{dest.photoGallery?.length || 0} image(s)</span>
                <div className="d-flex gap-2">
                  <CButton
                    size="sm"
                    color={galleryAddMode === 'upload' ? 'primary' : 'outline-primary'}
                    onClick={() => {
                      setGalleryAddMode(galleryAddMode === 'upload' ? null : 'upload')
                      setGalleryError(null)
                    }}
                  >
                    <CIcon icon={cilCloudUpload} size="sm" className="me-1" />
                    Upload
                  </CButton>
                  <CButton
                    size="sm"
                    color={galleryAddMode === 'url' ? 'primary' : 'outline-secondary'}
                    onClick={() => {
                      setGalleryAddMode(galleryAddMode === 'url' ? null : 'url')
                      setGalleryError(null)
                    }}
                  >
                    <CIcon icon={cilLink} size="sm" className="me-1" />
                    Import URL
                  </CButton>
                </div>
              </div>

              {galleryError && (
                <CAlert color="danger" className="py-2 small">
                  {galleryError}
                </CAlert>
              )}

              {/* Upload panel */}
              {galleryAddMode === 'upload' && (
                <div className="border rounded p-3 mb-3 bg-body-secondary">
                  <div className="small fw-semibold mb-2">Upload image to S3</div>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control form-control-sm mb-2"
                    onChange={(e) => setGalleryFile(e.target.files?.[0] || null)}
                  />
                  <div className="d-flex gap-2">
                    <CButton
                      size="sm"
                      color="primary"
                      disabled={!galleryFile || galleryUploading}
                      onClick={handleGalleryUpload}
                    >
                      {galleryUploading ? <CSpinner size="sm" className="me-1" /> : null}
                      {galleryUploading ? 'Uploading…' : 'Upload'}
                    </CButton>
                    <CButton
                      size="sm"
                      color="outline-secondary"
                      onClick={() => {
                        setGalleryAddMode(null)
                        setGalleryFile(null)
                      }}
                    >
                      Cancel
                    </CButton>
                  </div>
                </div>
              )}

              {/* URL import panel */}
              {galleryAddMode === 'url' && (
                <div className="border rounded p-3 mb-3 bg-body-secondary">
                  <div className="small fw-semibold mb-2">Import from URL</div>
                  <CFormInput
                    size="sm"
                    placeholder="https://example.com/image.jpg"
                    value={galleryUrlInput}
                    onChange={(e) => setGalleryUrlInput(e.target.value)}
                    className="mb-2"
                  />
                  <div className="d-flex gap-2">
                    <CButton
                      size="sm"
                      color="primary"
                      disabled={!galleryUrlInput.trim() || galleryUploading}
                      onClick={handleGalleryImportUrl}
                    >
                      {galleryUploading ? <CSpinner size="sm" className="me-1" /> : null}
                      {galleryUploading ? 'Importing…' : 'Import'}
                    </CButton>
                    <CButton
                      size="sm"
                      color="outline-secondary"
                      onClick={() => {
                        setGalleryAddMode(null)
                        setGalleryUrlInput('')
                      }}
                    >
                      Cancel
                    </CButton>
                  </div>
                </div>
              )}

              {/* Gallery grid */}
              {dest.photoGallery?.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 8,
                  }}
                >
                  {dest.photoGallery.map((url, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'relative',
                        borderRadius: 6,
                        overflow: 'hidden',
                        aspectRatio: '4/3',
                        background: '#f0f0f0',
                      }}
                    >
                      <img
                        src={url}
                        alt={`Photo ${i + 1}`}
                        onClick={() => setLightbox(i)}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          cursor: 'pointer',
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                      <button
                        onClick={() => handleGalleryDelete(url)}
                        disabled={galleryDeleting === url}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          background: 'rgba(220,53,69,0.85)',
                          border: 'none',
                          borderRadius: 4,
                          color: '#fff',
                          padding: '2px 6px',
                          cursor: 'pointer',
                          fontSize: 11,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                        title="Delete image"
                      >
                        {galleryDeleting === url ? (
                          <CSpinner size="sm" />
                        ) : (
                          <CIcon icon={cilTrash} size="sm" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted small">No photos in gallery.</div>
              )}
            </CTabPane>

            {/* â"€â"€ Trips â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
            <CTabPane visible={activeTab === 'trips'}>
              {dest.trips?.length > 0 ? (
                <>
                  {dest.trips.length < dest._count?.trips && (
                    <div className="small text-muted mb-2">
                      Showing latest {dest.trips.length} of {dest._count?.trips} trips.
                    </div>
                  )}
                  <CTable small hover responsive>
                    <CTableHead color="light">
                      <CTableRow>
                        <CTableHeaderCell>#</CTableHeaderCell>
                        <CTableHeaderCell>Title</CTableHeaderCell>
                        <CTableHeaderCell>Price</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Featured</CTableHeaderCell>
                        <CTableHeaderCell>Created</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {dest.trips.map((t, i) => (
                        <CTableRow key={t.id}>
                          <CTableDataCell className="small text-muted">{i + 1}</CTableDataCell>
                          <CTableDataCell className="small fw-semibold">
                            <span
                              style={{
                                color: 'var(--cui-primary)',
                                cursor: 'pointer',
                                textDecoration: 'none',
                              }}
                              onClick={() => navigate(`/trips/${t.id}`)}
                            >
                              {t.title}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell className="small">
                            {fmtPrice(t.priceMinor)}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={TRIP_STATUS_COLOR[t.status] || 'secondary'}>
                              {t.status}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={t.featured ? 'success' : 'secondary'}>
                              {t.featured ? 'Yes' : 'No'}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="small text-muted">
                            {fmtDate(t.createdAt)}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </>
              ) : (
                <div className="text-center py-4 text-muted small">
                  No trips at this destination.
                </div>
              )}
            </CTabPane>

            {/* â"€â"€ Reviews â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
            <CTabPane visible={activeTab === 'reviews'}>
              {dest.reviews?.length > 0 ? (
                <>
                  {avgRating && (
                    <div className="mb-3 d-flex align-items-center gap-2">
                      <CIcon
                        icon={cilStar}
                        className="text-warning"
                        style={{ width: 20, height: 20 }}
                      />
                      <span className="fs-4 fw-bold text-warning">{avgRating}</span>
                      <span className="small text-muted">
                        average from {dest._count?.reviews} reviews
                      </span>
                    </div>
                  )}
                  <div className="d-flex flex-column gap-3">
                    {dest.reviews.map((r) => (
                      <div key={r.id} className="p-3 bg-body-secondary rounded">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div className="d-flex align-items-center gap-2">
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                background: '#321fdb',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {(r.reviewer?.name || 'A').charAt(0).toUpperCase()}
                            </div>
                            <span className="small fw-semibold">
                              {r.reviewer?.name || 'Anonymous'}
                            </span>
                          </div>
                          <div className="d-flex gap-2 align-items-center">
                            <CBadge color="warning" textColor="dark">
                              <CIcon icon={cilStar} size="sm" className="me-1" />
                              {r.rating} / 5
                            </CBadge>
                            <span className="small text-muted">{fmtDate(r.createdAt)}</span>
                          </div>
                        </div>
                        {r.comment && <p className="small mb-0 mt-1">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-muted small">No reviews yet.</div>
              )}
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>

      {lightbox !== null && dest.photoGallery?.length > 0 && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1050,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CButton
            color="link"
            className="text-white position-absolute top-0 end-0 p-3"
            onClick={(e) => {
              e.stopPropagation()
              setLightbox(null)
            }}
            style={{ fontSize: 24, lineHeight: 1, zIndex: 2 }}
          >
            <CIcon icon={cilX} size="lg" />
          </CButton>
          {lightbox > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                setLightbox(lightbox - 1)
              }}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
                fontSize: 48,
                userSelect: 'none',
                background: 'linear-gradient(to right, rgba(0,0,0,0.3), transparent)',
              }}
            >
              &#8249;
            </div>
          )}
          <img
            src={dest.photoGallery[lightbox]}
            alt={`Photo ${lightbox + 1}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 4,
              boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
            }}
          />
          {lightbox < dest.photoGallery.length - 1 && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                setLightbox(lightbox + 1)
              }}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
                fontSize: 48,
                userSelect: 'none',
                background: 'linear-gradient(to left, rgba(0,0,0,0.3), transparent)',
              }}
            >
              &#8250;
            </div>
          )}
          <div
            className="position-absolute bottom-0 text-white small mb-3"
            style={{ opacity: 0.6 }}
          >
            {lightbox + 1} / {dest.photoGallery.length}
          </div>
        </div>
      )}
    </>
  )
}

export default DestinationDetail
