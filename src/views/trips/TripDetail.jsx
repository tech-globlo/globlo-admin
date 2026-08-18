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
  CFormTextarea,
  CFormSelect,
  CListGroup,
  CListGroupItem,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilCheck, cilX, cilArrowLeft, cilZoomIn, cilStar } from '@coreui/icons'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'
import { formatRupees } from '../../lib/constants'
import AdminMediaGallery from '../../components/AdminMediaGallery'

const fmtPrice = (minor) => (minor == null ? '-' : formatRupees(minor, { decimals: 0 }))

const STATUS_COLOR = {
  DRAFT: 'secondary',
  ACTIVE: 'success',
  RUNNING: 'info',
  CANCELLED: 'danger',
  COMPLETED: 'dark',
  ARCHIVED: 'secondary',
}
const PAYMENT_STATUS_COLOR = {
  PAID: 'success',
  PENDING: 'warning',
  CANCELLED: 'secondary',
  REFUNDED: 'info',
  FAILED: 'danger',
}
const ASSIGNMENT_STATUS_COLOR = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'secondary',
  COMPLETED: 'dark',
}
const BOOKING_STATUS_COLOR = {
  PENDING: 'warning',
  SUCCESS: 'success',
  CANCELLED: 'secondary',
  REJECTED: 'danger',
  FAILED: 'danger',
}
const DIFFICULTY_COLOR = { EASY: 'success', MODERATE: 'warning', CHALLENGING: 'danger' }

const Pill = ({ label, value }) => (
  <div className="text-center px-3" style={{ borderRight: '1px solid var(--cui-border-color)' }}>
    <div className="fw-bold small">{value ?? '-'}</div>
    <div
      style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}
      className="text-muted"
    >
      {label}
    </div>
  </div>
)

const InfoRow = ({ label, value, onClick }) => (
  <CListGroupItem
    className="d-flex justify-content-between align-items-start py-2 px-0 border-start-0 border-end-0"
    onClick={onClick}
    style={onClick ? { cursor: 'pointer' } : undefined}
  >
    <span className="text-muted small" style={{ minWidth: 130 }}>
      {label}
    </span>
    <div
      className="small fw-semibold text-end"
      style={{
        maxWidth: '60%',
        wordBreak: 'break-word',
        color: onClick ? 'var(--cui-link-color)' : undefined,
      }}
    >
      {value ?? '-'}
    </div>
  </CListGroupItem>
)

const LocationValue = ({ locationText, locationObject }) => {
  const { place, state, mapLocation, lat, long } = locationObject || {}
  const hasLocationObject = locationObject && typeof locationObject === 'object'

  return (
    <div>
      <div>{locationText || '-'}</div>
      {hasLocationObject && (
        <div className="text-muted fw-normal mt-1" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
          {[
            `place: ${place || '-'}`,
            `state: ${state || '-'}`,
            `mapLocation: ${mapLocation || '-'}`,
            `lat: ${lat ?? '-'}`,
            `long: ${long ?? '-'}`,
          ].join('\n')}
        </div>
      )}
    </div>
  )
}

const TripDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [tabError, setTabError] = useState(null)
  const [tabSuccess, setTabSuccess] = useState(null)
  const [viewProvider, setViewProvider] = useState(null)

  const {
    data: trip,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-trip', id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/trips/${id}`)
      return res.data.data
    },
  })

  useEffect(() => {
    if (trip) {
      setForm({
        title: trip.title || '',
        description: trip.description || '',
        startDate: trip.startDate ? trip.startDate.slice(0, 10) : '',
        endDate: trip.endDate ? trip.endDate.slice(0, 10) : '',
        startLocation: trip.startLocation || '',
        endLocation: trip.endLocation || '',
        maxSlots: trip.maxSlots ?? '',
        difficulty: trip.difficulty || 'MODERATE',
        includedServices: (trip.includedServices || []).join('\n'),
        excludedServices: (trip.excludedServices || []).join('\n'),
        tags: (trip.tags || []).join(', '),
        specialNeeds: trip.specialNeeds || '',
        status: trip.status || 'DRAFT',
        featured: trip.featured ?? false,
        isPublic: trip.isPublic ?? false,
      })
    }
  }, [trip])

  const saveMut = useMutation({
    mutationFn: (payload) => api.patch(`/api/admin/trips/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-trip', id] })
      qc.invalidateQueries({ queryKey: ['admin-trips'] })
      setEditing(false)
      setTabSuccess('Saved successfully.')
      setTimeout(() => setTabSuccess(null), 3000)
    },
    onError: (err) => setTabError(err.response?.data?.message || 'Save failed.'),
  })

  const handleSave = () => {
    setTabError(null)
    saveMut.mutate({
      title: form.title,
      description: form.description,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      startLocation: form.startLocation || undefined,
      endLocation: form.endLocation || undefined,
      maxSlots: form.maxSlots !== '' ? Number(form.maxSlots) : undefined,
      difficulty: form.difficulty,
      includedServices: form.includedServices
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      excludedServices: form.excludedServices
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      tags: form.tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      specialNeeds: form.specialNeeds || undefined,
      status: form.status,
      featured: form.featured,
      isPublic: form.isPublic,
    })
  }

  const handleCancel = () => {
    if (trip) {
      setForm({
        title: trip.title || '',
        description: trip.description || '',
        startDate: trip.startDate ? trip.startDate.slice(0, 10) : '',
        endDate: trip.endDate ? trip.endDate.slice(0, 10) : '',
        startLocation: trip.startLocation || '',
        endLocation: trip.endLocation || '',
        maxSlots: trip.maxSlots ?? '',
        difficulty: trip.difficulty || 'MODERATE',
        includedServices: (trip.includedServices || []).join('\n'),
        excludedServices: (trip.excludedServices || []).join('\n'),
        tags: (trip.tags || []).join(', '),
        specialNeeds: trip.specialNeeds || '',
        status: trip.status || 'DRAFT',
        featured: trip.featured ?? false,
        isPublic: trip.isPublic ?? false,
      })
    }
    setEditing(false)
    setTabError(null)
  }

  if (isLoading)
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  if (isError || !trip) return <CAlert color="danger">Failed to load trip.</CAlert>

  const coverImg = trip.imageUrls?.[0]
  const initials = trip.title?.charAt(0).toUpperCase() || 'T'
  const destPath = [trip.destination?.name, trip.destination?.state, trip.destination?.country]
    .filter(Boolean)
    .join(' / ')
  const avgRating = trip.rating?.toFixed(1)

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'itinerary', label: `Itinerary (${trip.itinerary?.length ?? 0})` },
    { key: 'participants', label: `Participants (${trip._count?.participants ?? 0})` },
    { key: 'payments', label: `Payments (${trip._count?.payments ?? 0})` },
    { key: 'providers', label: `Providers (${trip._count?.providerAssignments ?? 0})` },
    { key: 'reviews', label: `Reviews (${trip._count?.reviews ?? 0})` },
    { key: 'gallery', label: 'Gallery' },
  ]

  const f = (k) => form[k] ?? ''
  const setF = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const EditBar = () => (
    <div className="d-flex justify-content-end mb-3">
      {!editing ? (
        <CButton size="sm" color="outline-primary" onClick={() => setEditing(true)}>
          <CIcon icon={cilPencil} className="me-1" size="sm" />
          Edit
        </CButton>
      ) : (
        <div className="d-flex gap-2">
          <CButton
            size="sm"
            color="outline-secondary"
            onClick={handleCancel}
            disabled={saveMut.isLoading}
          >
            <CIcon icon={cilX} className="me-1" size="sm" />
            Cancel
          </CButton>
          <CButton size="sm" color="primary" onClick={handleSave} disabled={saveMut.isLoading}>
            {saveMut.isLoading ? (
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

  return (
    <>
      <CCard>
        <CCardHeader className="pb-0">
          <CButton
            color="link"
            className="p-0 mb-3 text-muted small d-block"
            onClick={() => navigate(-1)}
          >
            <CIcon icon={cilArrowLeft} className="me-1" size="sm" />
            Back
          </CButton>

          {/* Header strip */}
          <div className="d-flex align-items-start gap-3 mb-3">
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                flexShrink: 0,
                overflow: 'hidden',
                background: '#321fdb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {coverImg ? (
                <img
                  src={coverImg}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <span style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{initials}</span>
              )}
            </div>
            <div className="flex-grow-1">
              <div className="fw-semibold fs-5 mb-1">{trip.title}</div>
              <div className="small text-muted mb-2">{destPath}</div>
              <div className="d-flex flex-wrap gap-1">
                <CBadge color={STATUS_COLOR[trip.status] || 'secondary'}>{trip.status}</CBadge>
                <CBadge color={DIFFICULTY_COLOR[trip.difficulty] || 'secondary'}>
                  {trip.difficulty}
                </CBadge>
                {trip.featured && (
                  <CBadge color="warning" textColor="dark">
                    Featured
                  </CBadge>
                )}
                {trip.isPublic ? (
                  <CBadge color="success">Public</CBadge>
                ) : (
                  <CBadge color="secondary">Private</CBadge>
                )}
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div
            className="d-flex flex-wrap gap-0 mb-3 bg-body-secondary rounded p-2"
            style={{ overflowX: 'auto' }}
          >
            <Pill label="Duration" value={trip.durationDays ? trip.durationDays + 'd' : '-'} />
            <Pill label="Price / person" value={fmtPrice(trip.priceMinor)} />
            <Pill label="Participants" value={trip._count?.participants ?? 0} />
            <Pill label="Max Slots" value={trip.maxSlots ?? 'Open'} />
            <Pill label="Rating" value={avgRating ? avgRating + ' / 5' : '-'} />
            <Pill label="Reviews" value={trip.reviewCount ?? trip._count?.reviews ?? 0} />
            <Pill label="Confirmed" value={trip.confirmedParticipantsCount ?? 0} />
            <Pill label="Paid" value={trip.paidParticipantsCount ?? 0} />
            <Pill label="Favorited" value={trip.favoriteCount ?? 0} />
            <Pill label="Sightings" value={trip.sightingCount ?? 0} />
            <Pill label="Refunds" value={trip.refundCount ?? 0} />
            <Pill label="Pending Payouts" value={trip.pendingPayoutsCount ?? 0} />
            <div className="text-center px-3">
              <div className="fw-bold small">{fmtDate(trip.createdAt)}</div>
              <div
                style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}
                className="text-muted"
              >
                Created
              </div>
            </div>
          </div>

          <CNav variant="underline-border">
            {TABS.map((t) => (
              <CNavItem key={t.key}>
                <CNavLink
                  active={activeTab === t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{ cursor: 'pointer' }}
                >
                  {t.label}
                </CNavLink>
              </CNavItem>
            ))}
          </CNav>
        </CCardHeader>

        <CCardBody>
          {tabError && (
            <CAlert color="danger" className="py-2 small">
              {tabError}
            </CAlert>
          )}
          {tabSuccess && (
            <CAlert color="success" className="py-2 small">
              {tabSuccess}
            </CAlert>
          )}

          <CTabContent>
            {/* Overview */}
            <CTabPane visible={activeTab === 'overview'}>
              <EditBar />
              <CRow>
                <CCol md={6}>
                  <CListGroup flush className="mb-3">
                    <InfoRow
                      label="Title"
                      value={
                        editing ? (
                          <CFormInput
                            size="sm"
                            value={f('title')}
                            onChange={(e) => setF('title', e.target.value)}
                          />
                        ) : (
                          trip.title
                        )
                      }
                    />
                    <InfoRow
                      label="Description"
                      value={
                        editing ? (
                          <CFormTextarea
                            rows={4}
                            value={f('description')}
                            onChange={(e) => setF('description', e.target.value)}
                            style={{ fontSize: 13 }}
                          />
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{trip.description || '-'}</div>
                        )
                      }
                    />
                    <InfoRow
                      label="Special Needs / Accessibility"
                      value={
                        editing ? (
                          <CFormTextarea
                            rows={2}
                            value={f('specialNeeds')}
                            onChange={(e) => setF('specialNeeds', e.target.value)}
                            style={{ fontSize: 13 }}
                          />
                        ) : (
                          trip.specialNeeds || '-'
                        )
                      }
                    />
                    <InfoRow
                      label="Start Location"
                      value={
                        editing ? (
                          <CFormInput
                            size="sm"
                            value={f('startLocation')}
                            onChange={(e) => setF('startLocation', e.target.value)}
                          />
                        ) : (
                          <LocationValue
                            locationText={trip.startLocation}
                            locationObject={trip.startLocationObject}
                          />
                        )
                      }
                    />
                    <InfoRow
                      label="End Location"
                      value={
                        editing ? (
                          <CFormInput
                            size="sm"
                            value={f('endLocation')}
                            onChange={(e) => setF('endLocation', e.target.value)}
                          />
                        ) : (
                          <LocationValue
                            locationText={trip.endLocation}
                            locationObject={trip.endLocationObject}
                          />
                        )
                      }
                    />
                  </CListGroup>
                </CCol>
                <CCol md={6}>
                  <CListGroup flush className="mb-3">
                    <InfoRow
                      label="Destination"
                      value={destPath}
                      onClick={
                        trip.destination?.id
                          ? () => navigate('/destinations/' + trip.destination.id)
                          : undefined
                      }
                    />
                    <InfoRow
                      label="Start Date"
                      value={
                        editing ? (
                          <CFormInput
                            size="sm"
                            type="date"
                            value={f('startDate')}
                            onChange={(e) => setF('startDate', e.target.value)}
                          />
                        ) : (
                          fmtDate(trip.startDate)
                        )
                      }
                    />
                    <InfoRow
                      label="End Date"
                      value={
                        editing ? (
                          <CFormInput
                            size="sm"
                            type="date"
                            value={f('endDate')}
                            onChange={(e) => setF('endDate', e.target.value)}
                          />
                        ) : (
                          fmtDate(trip.endDate)
                        )
                      }
                    />
                    <InfoRow
                      label="Max Slots"
                      value={
                        editing ? (
                          <CFormInput
                            size="sm"
                            type="number"
                            value={f('maxSlots')}
                            onChange={(e) => setF('maxSlots', e.target.value)}
                          />
                        ) : (
                          trip.maxSlots
                        )
                      }
                    />
                    <InfoRow
                      label="Difficulty"
                      value={
                        editing ? (
                          <CFormSelect
                            size="sm"
                            value={f('difficulty')}
                            onChange={(e) => setF('difficulty', e.target.value)}
                          >
                            {['EASY', 'MODERATE', 'CHALLENGING'].map((d) => (
                              <option key={d}>{d}</option>
                            ))}
                          </CFormSelect>
                        ) : (
                          <CBadge color={DIFFICULTY_COLOR[trip.difficulty] || 'secondary'}>
                            {trip.difficulty}
                          </CBadge>
                        )
                      }
                    />
                    <InfoRow
                      label="Status"
                      value={
                        editing ? (
                          <CFormSelect
                            size="sm"
                            value={f('status')}
                            onChange={(e) => setF('status', e.target.value)}
                          >
                            {[
                              'DRAFT',
                              'ACTIVE',
                              'RUNNING',
                              'CANCELLED',
                              'COMPLETED',
                              'ARCHIVED',
                            ].map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </CFormSelect>
                        ) : (
                          <CBadge color={STATUS_COLOR[trip.status] || 'secondary'}>
                            {trip.status}
                          </CBadge>
                        )
                      }
                    />
                    {editing ? (
                      <>
                        <InfoRow
                          label="Featured"
                          value={
                            <div className="form-check form-switch mb-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={f('featured')}
                                onChange={(e) => setF('featured', e.target.checked)}
                              />
                            </div>
                          }
                        />
                        <InfoRow
                          label="Public"
                          value={
                            <div className="form-check form-switch mb-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={f('isPublic')}
                                onChange={(e) => setF('isPublic', e.target.checked)}
                              />
                            </div>
                          }
                        />
                      </>
                    ) : (
                      <>
                        <InfoRow label="Featured" value={trip.featured ? 'Yes' : 'No'} />
                        <InfoRow label="Public" value={trip.isPublic ? 'Yes' : 'No'} />
                      </>
                    )}
                    <InfoRow label="Itinerary Status" value={trip.itineraryStatus} />
                    {trip.cancellationReason && (
                      <InfoRow label="Cancellation Reason" value={trip.cancellationReason} />
                    )}
                    <InfoRow label="Created By" value={trip.createdByUser?.name} />
                    {trip.curatedBy && (
                      <InfoRow
                        label="Curated By (Agency)"
                        value={trip.curatedBy.agencyName || trip.curatedBy.user?.name}
                      />
                    )}
                    <InfoRow label="Created At" value={fmtDateTime(trip.createdAt)} />
                    <InfoRow label="Updated At" value={fmtDateTime(trip.updatedAt)} />
                  </CListGroup>

                  <div className="mb-3">
                    <div className="small fw-semibold text-muted mb-1">Tags</div>
                    {editing ? (
                      <CFormInput
                        size="sm"
                        value={f('tags')}
                        onChange={(e) => setF('tags', e.target.value)}
                        placeholder="comma-separated"
                      />
                    ) : trip.tags?.length > 0 ? (
                      <div className="d-flex flex-wrap gap-1">
                        {trip.tags.map((t) => (
                          <CBadge key={t} color="light" textColor="dark" className="border">
                            {t}
                          </CBadge>
                        ))}
                      </div>
                    ) : (
                      <span className="small text-muted">-</span>
                    )}
                  </div>
                </CCol>
              </CRow>

              <CRow className="mt-2">
                <CCol md={6}>
                  <div className="small fw-semibold text-muted mb-1">Included Services</div>
                  {editing ? (
                    <CFormTextarea
                      rows={4}
                      value={f('includedServices')}
                      onChange={(e) => setF('includedServices', e.target.value)}
                      placeholder="One per line"
                      style={{ fontSize: 13 }}
                    />
                  ) : trip.includedServices?.length > 0 ? (
                    <ul className="small ps-3 mb-0">
                      {trip.includedServices.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="small text-muted">-</span>
                  )}
                </CCol>
                <CCol md={6}>
                  <div className="small fw-semibold text-muted mb-1">Excluded Services</div>
                  {editing ? (
                    <CFormTextarea
                      rows={4}
                      value={f('excludedServices')}
                      onChange={(e) => setF('excludedServices', e.target.value)}
                      placeholder="One per line"
                      style={{ fontSize: 13 }}
                    />
                  ) : trip.excludedServices?.length > 0 ? (
                    <ul className="small ps-3 mb-0">
                      {trip.excludedServices.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="small text-muted">-</span>
                  )}
                </CCol>
              </CRow>
            </CTabPane>

            {/* Itinerary */}
            <CTabPane visible={activeTab === 'itinerary'}>
              {trip.itinerary?.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {trip.itinerary.map((day) => (
                    <div key={day.id} className="border rounded">
                      <div
                        className="d-flex align-items-center gap-2 p-3 bg-body-secondary rounded-top"
                        style={{ borderBottom: '1px solid var(--cui-border-color)' }}
                      >
                        <CBadge color="primary" style={{ minWidth: 36 }}>
                          Day {day.day}
                        </CBadge>
                        <span className="fw-semibold small">{day.title}</span>
                      </div>
                      {day.description && (
                        <div className="px-3 pt-2 pb-1 small text-muted">{day.description}</div>
                      )}
                      {day.activities?.length > 0 && (
                        <div className="p-3 pt-2">
                          <div className="d-flex flex-column gap-2">
                            {day.activities.map((act) => (
                              <div key={act.id} className="d-flex gap-3 small">
                                <span className="text-muted fw-semibold" style={{ minWidth: 48 }}>
                                  {act.time || '-'}
                                </span>
                                <div>
                                  <div className="fw-semibold">{act.activity}</div>
                                  {act.description && (
                                    <div className="text-muted">{act.description}</div>
                                  )}
                                  {act.location && (
                                    <div className="text-muted">
                                      <span className="fw-semibold">Location:</span> {act.location}
                                    </div>
                                  )}
                                  {act.gearNeeded?.length > 0 && (
                                    <div className="d-flex flex-wrap gap-1 mt-1">
                                      {act.gearNeeded.map((g, i) => (
                                        <CBadge
                                          key={i}
                                          color="light"
                                          textColor="dark"
                                          className="border"
                                        >
                                          {g}
                                        </CBadge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted small">No itinerary added yet.</div>
              )}
            </CTabPane>

            {/* Participants */}
            <CTabPane visible={activeTab === 'participants'}>
              {trip.participants?.length > 0 ? (
                <CTable small hover responsive>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell>#</CTableHeaderCell>
                      <CTableHeaderCell>Participant</CTableHeaderCell>
                      <CTableHeaderCell>Contact</CTableHeaderCell>
                      <CTableHeaderCell>Booking Status</CTableHeaderCell>
                      <CTableHeaderCell>Booking Type</CTableHeaderCell>
                      <CTableHeaderCell>Latest Payment</CTableHeaderCell>
                      <CTableHeaderCell>Amount Due</CTableHeaderCell>
                      <CTableHeaderCell>Joined</CTableHeaderCell>
                      <CTableHeaderCell>Action</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {trip.participants.map((p, i) => {
                      const latestPay = p.payments?.[0]
                      return (
                        <CTableRow key={p.id}>
                          <CTableDataCell className="small text-muted">{i + 1}</CTableDataCell>
                          <CTableDataCell>
                            <div
                              className="small fw-semibold"
                              style={{ color: 'var(--cui-primary)', cursor: 'pointer' }}
                              onClick={() => p.user?.id && navigate(`/users/${p.user.id}`)}
                            >
                              {p.user?.name || '-'}
                            </div>
                            <div className="small text-muted">{p.user?.role}</div>
                          </CTableDataCell>
                          <CTableDataCell className="small text-muted">
                            <div>{p.user?.email || '-'}</div>
                            {p.user?.phone && <div>{p.user.phone}</div>}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={BOOKING_STATUS_COLOR[p.status] || 'secondary'}>
                              {p.status}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="small">{p.bookingType || '-'}</CTableDataCell>
                          <CTableDataCell>
                            {latestPay ? (
                              <CBadge color={PAYMENT_STATUS_COLOR[latestPay.status] || 'secondary'}>
                                {latestPay.status}
                              </CBadge>
                            ) : (
                              <span className="small text-muted">-</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="small">{fmtPrice(p.amountDue)}</CTableDataCell>
                          <CTableDataCell className="small text-muted">
                            {fmtDate(p.createdAt)}
                          </CTableDataCell>
                          <CTableDataCell>
                            {p.user?.id && (
                              <CButton
                                size="sm"
                                color="outline-primary"
                                onClick={() => navigate(`/users/${p.user.id}`)}
                              >
                                <CIcon icon={cilZoomIn} size="sm" />
                              </CButton>
                            )}
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              ) : (
                <div className="text-center py-4 text-muted small">No participants yet.</div>
              )}
            </CTabPane>

            {/* Payments */}
            <CTabPane visible={activeTab === 'payments'}>
              {trip.payments?.length > 0 ? (
                <CTable small hover responsive>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell>#</CTableHeaderCell>
                      <CTableHeaderCell>From</CTableHeaderCell>
                      <CTableHeaderCell>Amount</CTableHeaderCell>
                      <CTableHeaderCell>Platform Fee</CTableHeaderCell>
                      <CTableHeaderCell>Total</CTableHeaderCell>
                      <CTableHeaderCell>Method</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Date</CTableHeaderCell>
                      <CTableHeaderCell>Action</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {trip.payments.map((pay, i) => (
                      <CTableRow key={pay.id}>
                        <CTableDataCell className="small text-muted">{i + 1}</CTableDataCell>
                        <CTableDataCell>
                          <div
                            className="small fw-semibold"
                            style={{ color: 'var(--cui-primary)', cursor: 'pointer' }}
                            onClick={() =>
                              pay.fromUser?.id && navigate(`/users/${pay.fromUser.id}`)
                            }
                          >
                            {pay.fromUser?.name || '-'}
                          </div>
                          <div className="small text-muted">{pay.fromUser?.email}</div>
                        </CTableDataCell>
                        <CTableDataCell className="small">
                          {fmtPrice(pay.amountMinor)}
                        </CTableDataCell>
                        <CTableDataCell className="small">
                          {fmtPrice(pay.platformFeeMinor)}
                        </CTableDataCell>
                        <CTableDataCell className="small fw-semibold">
                          {fmtPrice(pay.totalAmountMinor)}
                        </CTableDataCell>
                        <CTableDataCell className="small">
                          {pay.paymentMethod || '-'}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={PAYMENT_STATUS_COLOR[pay.status] || 'secondary'}>
                            {pay.status}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="small text-muted">
                          {fmtDate(pay.createdAt)}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            size="sm"
                            color="outline-primary"
                            onClick={() => navigate(`/payments/${pay.id}`)}
                          >
                            <CIcon icon={cilZoomIn} size="sm" />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              ) : (
                <div className="text-center py-4 text-muted small">No payments yet.</div>
              )}
            </CTabPane>

            {/* Providers */}
            <CTabPane visible={activeTab === 'providers'}>
              {trip.providerAssignments?.length > 0 ? (
                <CTable small hover responsive>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell>#</CTableHeaderCell>
                      <CTableHeaderCell>Gate</CTableHeaderCell>
                      <CTableHeaderCell>Provider</CTableHeaderCell>
                      <CTableHeaderCell>Service</CTableHeaderCell>
                      <CTableHeaderCell>Dates</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Agreed Amount</CTableHeaderCell>
                      <CTableHeaderCell>Payment Status</CTableHeaderCell>
                      <CTableHeaderCell>Action</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {/* Sorted by gate so assignments visually cluster per gate
                        visit — two SPs on the same service/status but
                        different gates are each a distinct, intentional
                        assignment, not a duplicate (see project_admin_gates_scope
                        memory: don't treat these as redundant). */}
                    {[...trip.providerAssignments]
                      .sort((a, b) => {
                        const gateA = a.tripDestinationGate?.destinationGate?.gateName || ''
                        const gateB = b.tripDestinationGate?.destinationGate?.gateName || ''
                        return gateA.localeCompare(gateB)
                      })
                      .map((a, i) => (
                        <CTableRow key={a.id}>
                          <CTableDataCell className="small text-muted">{i + 1}</CTableDataCell>
                          <CTableDataCell>
                            {a.tripDestinationGate?.destinationGate?.gateName ? (
                              <>
                                <div className="small fw-semibold">
                                  {a.tripDestinationGate.destinationGate.gateName}
                                </div>
                                {a.tripDestinationGate.destinationGate.zoneType && (
                                  <div className="small text-muted">
                                    {a.tripDestinationGate.destinationGate.zoneType}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="small text-muted">—</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            <div
                              className="small fw-semibold"
                              style={{ color: 'var(--cui-primary)', cursor: 'pointer' }}
                              onClick={() =>
                                a.providerUser?.id && navigate(`/users/${a.providerUser.id}`)
                              }
                            >
                              {a.providerUser?.name || '-'}
                            </div>
                            <div className="small text-muted">{a.providerUser?.email}</div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="small fw-semibold">
                              {a.serviceDetails?.title || a.serviceType}
                            </div>
                            {a.serviceDetails?.serviceType && (
                              <div className="small text-muted">{a.serviceDetails.serviceType}</div>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="small text-muted">
                            <div>{fmtDate(a.startDate)}</div>
                            <div>{fmtDate(a.endDate)}</div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge
                              color={ASSIGNMENT_STATUS_COLOR[a.assignmentStatus] || 'secondary'}
                            >
                              {a.assignmentStatus}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="small">
                            {fmtPrice(a.agreedAmountMinor ?? a.totalCostMinor)}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge
                              color={
                                a.paymentStatus === 'PAID'
                                  ? 'success'
                                  : a.paymentStatus === 'NONE'
                                    ? 'secondary'
                                    : 'warning'
                              }
                            >
                              {a.paymentStatus}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CButton
                              size="sm"
                              color="outline-primary"
                              title="View details"
                              onClick={() => setViewProvider(a)}
                            >
                              <CIcon icon={cilZoomIn} size="sm" />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                  </CTableBody>
                </CTable>
              ) : (
                <div className="text-center py-4 text-muted small">No providers assigned yet.</div>
              )}
            </CTabPane>

            {/* Reviews */}
            <CTabPane visible={activeTab === 'reviews'}>
              {trip.reviews?.length > 0 ? (
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
                        / 5 average from {trip._count?.reviews} reviews
                      </span>
                    </div>
                  )}
                  <div className="d-flex flex-column gap-3">
                    {trip.reviews.map((r) => (
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

            {/* Gallery */}
            <CTabPane visible={activeTab === 'gallery'}>
              <AdminMediaGallery tripId={id} cacheKey={`trip-gallery-${id}`} showTypeLabel />
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>

      {/* Provider Assignment Detail Modal */}
      <CModal visible={!!viewProvider} onClose={() => setViewProvider(null)} size="lg">
        <CModalHeader>
          <CModalTitle>Provider Assignment Details</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {viewProvider && (
            <CRow className="g-3">
              <CCol md={6}>
                <div
                  className="small fw-semibold text-uppercase text-muted mb-2"
                  style={{ letterSpacing: 1 }}
                >
                  Provider
                </div>
                <CListGroup flush>
                  <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                    <span className="text-muted small">Name</span>
                    <span className="small fw-semibold">
                      {viewProvider.providerUser?.name || '-'}
                    </span>
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                    <span className="text-muted small">Email</span>
                    <span className="small">{viewProvider.providerUser?.email || '-'}</span>
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                    <span className="text-muted small">Phone</span>
                    <span className="small">{viewProvider.providerUser?.phone || '-'}</span>
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                    <span className="text-muted small">Role</span>
                    <span className="small">{viewProvider.providerUser?.role || '-'}</span>
                  </CListGroupItem>
                </CListGroup>
              </CCol>
              <CCol md={6}>
                <div
                  className="small fw-semibold text-uppercase text-muted mb-2"
                  style={{ letterSpacing: 1 }}
                >
                  Service
                </div>
                <CListGroup flush>
                  <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                    <span className="text-muted small">Title</span>
                    <span className="small fw-semibold">
                      {viewProvider.serviceDetails?.title || viewProvider.serviceType || '-'}
                    </span>
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                    <span className="text-muted small">Type</span>
                    <span className="small">
                      {viewProvider.serviceDetails?.serviceType || viewProvider.serviceType || '-'}
                    </span>
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                    <span className="text-muted small">Start Date</span>
                    <span className="small">{fmtDate(viewProvider.startDate)}</span>
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                    <span className="text-muted small">End Date</span>
                    <span className="small">{fmtDate(viewProvider.endDate)}</span>
                  </CListGroupItem>
                </CListGroup>
              </CCol>
              <CCol md={6}>
                <div
                  className="small fw-semibold text-uppercase text-muted mb-2"
                  style={{ letterSpacing: 1 }}
                >
                  Assignment
                </div>
                <CListGroup flush>
                  <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                    <span className="text-muted small">Status</span>
                    <CBadge
                      color={ASSIGNMENT_STATUS_COLOR[viewProvider.assignmentStatus] || 'secondary'}
                    >
                      {viewProvider.assignmentStatus}
                    </CBadge>
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                    <span className="text-muted small">Payment Status</span>
                    <CBadge
                      color={
                        viewProvider.paymentStatus === 'PAID'
                          ? 'success'
                          : viewProvider.paymentStatus === 'NONE'
                            ? 'secondary'
                            : 'warning'
                      }
                    >
                      {viewProvider.paymentStatus}
                    </CBadge>
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                    <span className="text-muted small">Agreed Amount</span>
                    <span className="small fw-semibold">
                      {fmtPrice(viewProvider.agreedAmountMinor ?? viewProvider.totalCostMinor)}
                    </span>
                  </CListGroupItem>
                </CListGroup>
              </CCol>
              {viewProvider.notes && (
                <CCol md={6}>
                  <div
                    className="small fw-semibold text-uppercase text-muted mb-2"
                    style={{ letterSpacing: 1 }}
                  >
                    Notes
                  </div>
                  <div
                    className="small bg-body-secondary rounded p-2"
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {viewProvider.notes}
                  </div>
                </CCol>
              )}
            </CRow>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setViewProvider(null)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default TripDetail
