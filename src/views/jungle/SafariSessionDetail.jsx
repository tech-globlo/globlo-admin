import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert, CListGroup, CListGroupItem,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormLabel, CFormInput,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'
import EntityPicker from '../../components/EntityPicker'

const EMPTY_SIGHTING_FORM = {
  reporterUser: null,
  species: null,
  speciesText: '',
  count: '1',
  observedAt: '',
  latitude: '',
  longitude: '',
  confidence: '80',
  notes: '',
  photoFile: null,
}

const EMPTY_BULK_ROW = {
  species: null,
  speciesText: '',
  count: '1',
  observedAt: '',
  latitude: '',
  longitude: '',
  confidence: '80',
  notes: '',
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const readImageDimensions = (file) =>
  new Promise((resolve) => {
    const img = new Image()
    const objUrl = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(objUrl); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(objUrl); resolve({}) }
    img.src = objUrl
  })

const STATUS_COLOR = { ACTIVE: 'success', ENDED: 'secondary', ABANDONED: 'warning' }

// Builds a Google Maps directions link from a GeoJSON LineString's
// coordinates — no map library/dependency needed just to let an admin open
// the recorded route externally.
const routeMapsUrl = (routeGeojson) => {
  const coords = routeGeojson?.coordinates
  if (!Array.isArray(coords) || coords.length === 0) return null
  // GeoJSON is [lng, lat]; Google Maps wants lat,lng.
  const points = coords.filter((c) => Array.isArray(c) && c.length >= 2)
  if (points.length === 0) return null
  const path = points.map(([lng, lat]) => `${lat},${lng}`).join('/')
  return `https://www.google.com/maps/dir/${path}`
}

const pointMapsUrl = (lat, lng) =>
  lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null

const SafariSessionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['admin-safari-session', id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/safari-sessions/${id}`)
      return res.data.data
    },
  })

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_SIGHTING_FORM)
  const [mutError, setMutError] = useState('')
  const f = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const openCreate = () => {
    // Defaults to whoever started the session — in the real app, only a
    // session's starter/participant can log a sighting to it. Admin can
    // still override via the picker below (e.g. backfilling old data).
    setForm({ ...EMPTY_SIGHTING_FORM, reporterUser: session?.startedByUser || null })
    setMutError('')
    setModal(true)
  }

  const [saving, setSaving] = useState(false)

  const canSave =
    !!form.reporterUser &&
    (!!form.species || !!form.speciesText.trim()) &&
    !!form.observedAt

  const handleSave = async () => {
    setSaving(true)
    setMutError('')
    try {
      const res = await api.post(`/api/admin/safari-sessions/${id}/sightings`, {
        reporterUserId: form.reporterUser.id,
        speciesId: form.species?.id || undefined,
        speciesText: form.species ? undefined : (form.speciesText.trim() || undefined),
        count: parseInt(form.count, 10) || 1,
        observedAt: new Date(form.observedAt).toISOString(),
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        confidence: parseInt(form.confidence, 10) || 80,
        notes: form.notes.trim() || undefined,
      })
      const sightingId = res.data.data.id

      if (form.photoFile) {
        const [dataUrl, dims] = await Promise.all([
          readFileAsDataUrl(form.photoFile),
          readImageDimensions(form.photoFile),
        ])
        await api.post(`/api/admin/safari-sessions/${id}/sightings/${sightingId}/media`, {
          dataUrl,
          filename: form.photoFile.name,
          mimeType: form.photoFile.type,
          ...dims,
        })
      }

      await qc.invalidateQueries({ queryKey: ['admin-safari-session', id] })
      setModal(false)
    } catch (err) {
      setMutError(err?.response?.data?.message || 'Failed to add sighting.')
    } finally {
      setSaving(false)
    }
  }

  // ── Bulk add ───────────────────────────────────────────────────────────
  const [bulkModal, setBulkModal] = useState(false)
  const [bulkReporter, setBulkReporter] = useState(null)
  const [bulkRows, setBulkRows] = useState([EMPTY_BULK_ROW])
  const [bulkError, setBulkError] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  // ── End session ────────────────────────────────────────────────────────
  const [endModal, setEndModal] = useState(false)
  const [endStatus, setEndStatus] = useState('ENDED')
  const [endNotes, setEndNotes] = useState('')
  const [endError, setEndError] = useState('')
  const [ending, setEnding] = useState(false)

  const openEnd = () => {
    setEndStatus('ENDED')
    setEndNotes('')
    setEndError('')
    setEndModal(true)
  }

  const [verifyingId, setVerifyingId] = useState(null)

  const handleVerify = async (sightingId) => {
    setVerifyingId(sightingId)
    try {
      await api.post(`/api/admin/sightings/${sightingId}/verify`, {})
      await qc.invalidateQueries({ queryKey: ['admin-safari-session', id] })
    } catch {
      // Table remains unverified on failure; admin can retry.
    } finally {
      setVerifyingId(null)
    }
  }

  const handleEnd = async () => {
    setEnding(true)
    setEndError('')
    try {
      await api.post(`/api/admin/safari-sessions/${id}/end`, {
        status: endStatus,
        notes: endNotes.trim() || undefined,
      })
      await qc.invalidateQueries({ queryKey: ['admin-safari-session', id] })
      await qc.invalidateQueries({ queryKey: ['admin-safari-sessions'] })
      setEndModal(false)
    } catch (err) {
      setEndError(err?.response?.data?.message || 'Failed to end session.')
    } finally {
      setEnding(false)
    }
  }

  const openBulkCreate = () => {
    setBulkReporter(session?.startedByUser || null)
    setBulkRows([{ ...EMPTY_BULK_ROW }])
    setBulkError('')
    setBulkModal(true)
  }

  const updateBulkRow = (idx, k, v) =>
    setBulkRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [k]: v } : row)))
  const addBulkRow = () => setBulkRows((prev) => [...prev, { ...EMPTY_BULK_ROW }])
  const removeBulkRow = (idx) => setBulkRows((prev) => prev.filter((_, i) => i !== idx))

  const canSaveBulk =
    !!bulkReporter &&
    bulkRows.length > 0 &&
    bulkRows.every((r) => (!!r.species || !!r.speciesText.trim()) && !!r.observedAt)

  const handleBulkSave = async () => {
    setBulkSaving(true)
    setBulkError('')
    try {
      await api.post(`/api/admin/safari-sessions/${id}/sightings/bulk`, {
        sightings: bulkRows.map((r) => ({
          reporterUserId: bulkReporter.id,
          speciesId: r.species?.id || undefined,
          speciesText: r.species ? undefined : (r.speciesText.trim() || undefined),
          count: parseInt(r.count, 10) || 1,
          observedAt: new Date(r.observedAt).toISOString(),
          latitude: r.latitude ? parseFloat(r.latitude) : undefined,
          longitude: r.longitude ? parseFloat(r.longitude) : undefined,
          confidence: parseInt(r.confidence, 10) || 80,
          notes: r.notes.trim() || undefined,
        })),
      })
      await qc.invalidateQueries({ queryKey: ['admin-safari-session', id] })
      setBulkModal(false)
    } catch (err) {
      setBulkError(err?.response?.data?.message || 'Failed to add sightings.')
    } finally {
      setBulkSaving(false)
    }
  }

  if (isLoading) return <div className="text-center py-5"><CSpinner color="primary" /></div>
  if (isError) return <CAlert color="danger">Failed to load session.</CAlert>
  if (!session) return null

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <CButton color="secondary" size="sm" onClick={() => navigate(-1)}>
          <CIcon icon={cilArrowLeft} className="me-1" size="sm" />Back
        </CButton>
        {session.status === 'ACTIVE' && (
          <CButton color="danger" size="sm" onClick={openEnd}>End Safari</CButton>
        )}
      </div>

      <CRow className="g-3">
        <CCol md={4}>
          <CCard>
            <CCardHeader><strong>Session Info</strong></CCardHeader>
            <CCardBody className="p-0">
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-muted small">Status</span>
                  <CBadge color={STATUS_COLOR[session.status] || 'secondary'}>{session.status}</CBadge>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-muted small">Started By</span>
                  <span className="small">{session.startedByUser?.name}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-muted small">Destination</span>
                  <span className="small">{session.destination?.name}</span>
                </CListGroupItem>
                {session.trip && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted small">Trip</span>
                    <span className="small">{session.trip.title}</span>
                  </CListGroupItem>
                )}
                {session.zone && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted small">Zone</span>
                    <span className="small">{session.zone}</span>
                  </CListGroupItem>
                )}
                {session.vehicleId && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted small">Vehicle</span>
                    <span className="small">{session.vehicleId}</span>
                  </CListGroupItem>
                )}
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-muted small">Start</span>
                  <span className="small">{fmtDateTime(session.startTime)}</span>
                </CListGroupItem>
                {session.endTime && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted small">End</span>
                    <span className="small">{fmtDateTime(session.endTime)}</span>
                  </CListGroupItem>
                )}
                {session.distanceMeters != null && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted small">Distance</span>
                    <span className="small">{(session.distanceMeters / 1000).toFixed(1)} km</span>
                  </CListGroupItem>
                )}
                {routeMapsUrl(session.routeGeojson) && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted small">GPS Track</span>
                    <a href={routeMapsUrl(session.routeGeojson)} target="_blank" rel="noreferrer" className="small">
                      View route ({session.routeGeojson.coordinates.length} points)
                    </a>
                  </CListGroupItem>
                )}
                <CListGroupItem>
                  <div className="text-muted small mb-1">
                    Participants ({session.participantUsers?.length ?? session.participants?.length ?? 0})
                  </div>
                  {session.participantUsers?.length > 0 ? (
                    <div className="small">
                      {session.participantUsers.map((u) => (
                        <div key={u.id}>{u.name || u.email || u.id}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="small text-muted">-</span>
                  )}
                </CListGroupItem>
                {session.weather && typeof session.weather === 'object' && (
                  <CListGroupItem>
                    <div className="text-muted small mb-1">Weather</div>
                    <div className="small">
                      {Object.entries(session.weather)
                        .filter(([, v]) => v != null && v !== '')
                        .map(([k, v]) => (
                          <div key={k}>
                            {k}: {String(v)}
                          </div>
                        ))}
                    </div>
                  </CListGroupItem>
                )}
                {session.notes && (
                  <CListGroupItem>
                    <div className="text-muted small mb-1">Notes</div>
                    <div className="small">{session.notes}</div>
                  </CListGroupItem>
                )}
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={8}>
          <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <strong>Sightings</strong>
                <span className="ms-2 text-muted small">({session.sightings?.length || 0})</span>
              </div>
              <div className="d-flex gap-2">
                <CButton size="sm" color="outline-primary" onClick={openBulkCreate}>+ Bulk Add</CButton>
                <CButton size="sm" color="primary" onClick={openCreate}>+ Add Sighting</CButton>
              </div>
            </CCardHeader>
            <CCardBody>
              {session.sightings?.length === 0 && (
                <p className="text-muted small mb-0">No sightings recorded.</p>
              )}
              {session.sightings?.length > 0 && (
                <CTable hover responsive small>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Photo</CTableHeaderCell>
                      <CTableHeaderCell>Species</CTableHeaderCell>
                      <CTableHeaderCell>Group</CTableHeaderCell>
                      <CTableHeaderCell>Count</CTableHeaderCell>
                      <CTableHeaderCell>Reporter</CTableHeaderCell>
                      <CTableHeaderCell>Location</CTableHeaderCell>
                      <CTableHeaderCell>Zone</CTableHeaderCell>
                      <CTableHeaderCell>Source</CTableHeaderCell>
                      <CTableHeaderCell>Confidence</CTableHeaderCell>
                      <CTableHeaderCell>Verified</CTableHeaderCell>
                      <CTableHeaderCell>Observed At</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {session.sightings.map((s) => (
                      <CTableRow key={s.id}>
                        <CTableDataCell>
                          {s.media?.[0] ? (
                            <a href={s.media[0].url} target="_blank" rel="noreferrer">
                              <img
                                src={s.media[0].thumbUrl || s.media[0].url}
                                alt=""
                                style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }}
                              />
                            </a>
                          ) : (
                            <span className="text-muted small">-</span>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="small fw-semibold">
                          {s.species?.commonName || s.speciesText || '-'}
                          {s.notes && (
                            <div className="text-muted fw-normal mt-1" style={{ fontSize: 11 }}>
                              {s.notes}
                            </div>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {s.species?.taxonGroup && (
                            <CBadge color="light" textColor="dark">{s.species.taxonGroup}</CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="small">{s.count}</CTableDataCell>
                        <CTableDataCell className="small">
                          {s.reporter?.name || s.reporter?.email || s.reporterUserId}
                        </CTableDataCell>
                        <CTableDataCell className="small">
                          {pointMapsUrl(s.latitude, s.longitude) ? (
                            <a href={pointMapsUrl(s.latitude, s.longitude)} target="_blank" rel="noreferrer">
                              {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                            </a>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="small text-muted">{s.zone || '-'}</CTableDataCell>
                        <CTableDataCell className="small text-muted">{s.source}</CTableDataCell>
                        <CTableDataCell className="small">{s.confidence}%</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={s.isVerified ? 'success' : 'secondary'}>
                            {s.isVerified ? 'Yes' : 'No'}
                          </CBadge>
                          {s.isVerified && (s.verifiedBy || s.verifiedAt) && (
                            <div className="text-muted mt-1" style={{ fontSize: 10 }}>
                              {s.verifiedBy && s.verifiedBy !== 'SYSTEM_HEURISTIC' ? s.verifiedBy : 'System'}
                              {s.verifiedAt ? ` · ${fmtDateTime(s.verifiedAt)}` : ''}
                            </div>
                          )}
                          {!s.isVerified && (
                            <CButton
                              size="sm" color="link" className="p-0 d-block mt-1"
                              disabled={verifyingId === s.id}
                              onClick={() => handleVerify(s.id)}
                            >
                              {verifyingId === s.id ? <CSpinner size="sm" /> : 'Verify'}
                            </CButton>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="small text-muted">
                          {fmtDateTime(s.observedAt)}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal visible={modal} onClose={() => { setModal(false); setMutError('') }}>
        <CModalHeader>
          <CModalTitle>Add Sighting</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">
            <EntityPicker
              label="Reporter"
              placeholder="Search by name/email/phone..."
              endpoint="/api/admin/users"
              labelKey="name"
              sublabelKey="email"
              value={form.reporterUser}
              onChange={(v) => f('reporterUser', v)}
              required
            />
            <EntityPicker
              label="Species"
              placeholder="Search species..."
              endpoint="/api/admin/species"
              labelKey="commonName"
              sublabelKey="scientificName"
              value={form.species}
              onChange={(v) => f('species', v)}
              required={!form.speciesText.trim()}
            />
            {!form.species && (
              <div>
                <CFormLabel className="small">Or free-text species (if not in the list above)</CFormLabel>
                <CFormInput
                  size="sm" value={form.speciesText}
                  onChange={(e) => f('speciesText', e.target.value)}
                  placeholder="e.g. unknown bird of prey"
                />
              </div>
            )}
            <div className="row g-3">
              <div className="col-md-6">
                <CFormLabel className="small">Observed At *</CFormLabel>
                <CFormInput size="sm" type="datetime-local" value={form.observedAt} onChange={(e) => f('observedAt', e.target.value)} />
              </div>
              <div className="col-md-6">
                <CFormLabel className="small">Count</CFormLabel>
                <CFormInput size="sm" type="number" min="1" value={form.count} onChange={(e) => f('count', e.target.value)} />
              </div>
            </div>
            <div className="row g-3">
              <div className="col-md-4">
                <CFormLabel className="small">Latitude</CFormLabel>
                <CFormInput size="sm" type="number" step="any" value={form.latitude} onChange={(e) => f('latitude', e.target.value)} />
              </div>
              <div className="col-md-4">
                <CFormLabel className="small">Longitude</CFormLabel>
                <CFormInput size="sm" type="number" step="any" value={form.longitude} onChange={(e) => f('longitude', e.target.value)} />
              </div>
              <div className="col-md-4">
                <CFormLabel className="small">Confidence (%)</CFormLabel>
                <CFormInput size="sm" type="number" min="0" max="100" value={form.confidence} onChange={(e) => f('confidence', e.target.value)} />
              </div>
            </div>
            <div>
              <CFormLabel className="small">Notes (optional)</CFormLabel>
              <CFormInput size="sm" value={form.notes} onChange={(e) => f('notes', e.target.value)} />
            </div>
            <div>
              <CFormLabel className="small">Photo (optional)</CFormLabel>
              <CFormInput
                size="sm" type="file" accept="image/*"
                onChange={(e) => f('photoFile', e.target.files?.[0] || null)}
              />
              {form.photoFile && (
                <div className="text-muted small mt-1">{form.photoFile.name}</div>
              )}
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter className="flex-column align-items-stretch gap-2">
          {mutError && <CAlert color="danger" className="mb-0 py-2 small">{mutError}</CAlert>}
          <div className="d-flex justify-content-end gap-2">
            <CButton color="secondary" onClick={() => { setModal(false); setMutError('') }}>Cancel</CButton>
            <CButton color="primary" onClick={handleSave} disabled={saving || !canSave}>
              {saving ? <CSpinner size="sm" /> : 'Create'}
            </CButton>
          </div>
        </CModalFooter>
      </CModal>

      <CModal size="xl" visible={bulkModal} onClose={() => { setBulkModal(false); setBulkError('') }}>
        <CModalHeader>
          <CModalTitle>Bulk Add Sightings</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3" style={{ maxWidth: 360 }}>
            <EntityPicker
              label="Reporter (applies to all rows)"
              placeholder="Search by name/email/phone..."
              endpoint="/api/admin/users"
              labelKey="name"
              sublabelKey="email"
              value={bulkReporter}
              onChange={setBulkReporter}
              required
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <CTable bordered small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ minWidth: 220 }}>Species *</CTableHeaderCell>
                  <CTableHeaderCell style={{ minWidth: 90 }}>Count</CTableHeaderCell>
                  <CTableHeaderCell style={{ minWidth: 190 }}>Observed At *</CTableHeaderCell>
                  <CTableHeaderCell style={{ minWidth: 110 }}>Latitude</CTableHeaderCell>
                  <CTableHeaderCell style={{ minWidth: 110 }}>Longitude</CTableHeaderCell>
                  <CTableHeaderCell style={{ minWidth: 100 }}>Confidence</CTableHeaderCell>
                  <CTableHeaderCell style={{ minWidth: 160 }}>Notes</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 40 }}></CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {bulkRows.map((row, idx) => (
                  <CTableRow key={idx}>
                    <CTableDataCell>
                      <EntityPicker
                        label=""
                        placeholder="Search species..."
                        endpoint="/api/admin/species"
                        labelKey="commonName"
                        sublabelKey="scientificName"
                        value={row.species}
                        onChange={(v) => updateBulkRow(idx, 'species', v)}
                      />
                      {!row.species && (
                        <CFormInput
                          size="sm" className="mt-1"
                          placeholder="or free-text species"
                          value={row.speciesText}
                          onChange={(e) => updateBulkRow(idx, 'speciesText', e.target.value)}
                        />
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormInput size="sm" type="number" min="1" value={row.count} onChange={(e) => updateBulkRow(idx, 'count', e.target.value)} />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormInput size="sm" type="datetime-local" value={row.observedAt} onChange={(e) => updateBulkRow(idx, 'observedAt', e.target.value)} />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormInput size="sm" type="number" step="any" value={row.latitude} onChange={(e) => updateBulkRow(idx, 'latitude', e.target.value)} />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormInput size="sm" type="number" step="any" value={row.longitude} onChange={(e) => updateBulkRow(idx, 'longitude', e.target.value)} />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormInput size="sm" type="number" min="0" max="100" value={row.confidence} onChange={(e) => updateBulkRow(idx, 'confidence', e.target.value)} />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CFormInput size="sm" value={row.notes} onChange={(e) => updateBulkRow(idx, 'notes', e.target.value)} />
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        size="sm" color="link" className="text-danger p-0"
                        disabled={bulkRows.length === 1}
                        onClick={() => removeBulkRow(idx)}
                        title="Remove row"
                      >
                        ×
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
          <CButton size="sm" color="outline-secondary" onClick={addBulkRow}>+ Add Row</CButton>
        </CModalBody>
        <CModalFooter className="flex-column align-items-stretch gap-2">
          {bulkError && <CAlert color="danger" className="mb-0 py-2 small">{bulkError}</CAlert>}
          <div className="d-flex justify-content-end gap-2">
            <CButton color="secondary" onClick={() => { setBulkModal(false); setBulkError('') }}>Cancel</CButton>
            <CButton color="primary" onClick={handleBulkSave} disabled={bulkSaving || !canSaveBulk}>
              {bulkSaving ? <CSpinner size="sm" /> : `Create ${bulkRows.length} Sighting${bulkRows.length > 1 ? 's' : ''}`}
            </CButton>
          </div>
        </CModalFooter>
      </CModal>

      <CModal visible={endModal} onClose={() => { setEndModal(false); setEndError('') }}>
        <CModalHeader>
          <CModalTitle>End Safari Session</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">
            <div>
              <CFormLabel className="small">Outcome</CFormLabel>
              <div className="d-flex gap-3">
                <div className="form-check">
                  <input
                    className="form-check-input" type="radio" id="endStatusEnded"
                    checked={endStatus === 'ENDED'} onChange={() => setEndStatus('ENDED')}
                  />
                  <label className="form-check-label small" htmlFor="endStatusEnded">Ended normally</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input" type="radio" id="endStatusAbandoned"
                    checked={endStatus === 'ABANDONED'} onChange={() => setEndStatus('ABANDONED')}
                  />
                  <label className="form-check-label small" htmlFor="endStatusAbandoned">Abandoned</label>
                </div>
              </div>
            </div>
            <div>
              <CFormLabel className="small">Notes (optional)</CFormLabel>
              <CFormInput size="sm" value={endNotes} onChange={(e) => setEndNotes(e.target.value)} placeholder="e.g. ended by support, user lost connectivity" />
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter className="flex-column align-items-stretch gap-2">
          {endError && <CAlert color="danger" className="mb-0 py-2 small">{endError}</CAlert>}
          <div className="d-flex justify-content-end gap-2">
            <CButton color="secondary" onClick={() => { setEndModal(false); setEndError('') }}>Cancel</CButton>
            <CButton color="danger" onClick={handleEnd} disabled={ending}>
              {ending ? <CSpinner size="sm" /> : 'End Session'}
            </CButton>
          </div>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default SafariSessionDetail
