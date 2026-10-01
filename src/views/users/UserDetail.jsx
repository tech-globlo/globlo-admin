import React, { useState } from 'react'
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
  CFormSelect,
  CFormTextarea,
  CFormInput,
  CFormCheck,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPencil,
  cilArrowLeft,
  cilPlus,
  cilTrash,
  cilZoomIn,
  cilBell,
  cilHistory,
  cilMoney,
  cilCalendar,
  cilSearch,
  cilStar,
  cilShareAll,
  cilBookmark,
} from '@coreui/icons'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'
import { formatRupees } from '../../lib/constants'
import AdminMediaGallery from '../../components/AdminMediaGallery'
import AdminTableFooter from '../../components/AdminTableFooter'

// -- Constants ----------------------------------------------------------------

const STATUS_COLOR = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  BANNED: 'danger',
  DEACTIVATED: 'secondary',
  PENDING_DELETION: 'dark',
}
const DOC_STATUS_COLOR = {
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'secondary',
}
const humanizeDocType = (s) => (s || '').replace(/_/g, ' ').toLowerCase()
const TRIP_STATUS_COLOR = {
  ACTIVE: 'success',
  RUNNING: 'info',
  DRAFT: 'secondary',
  COMPLETED: 'dark',
  CANCELLED: 'danger',
}
const PAYMENT_STATUS_COLOR = {
  PAID: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
  CANCELLED: 'secondary',
  REFUNDED: 'info',
}
const BOOKING_STATUS_COLOR = {
  CONFIRMED: 'success',
  PENDING: 'warning',
  CANCELLED: 'danger',
  WAITLISTED: 'info',
}
// BookingParticipant.status on a Payment row — separate from Payment.status
// itself. A PG can cancel after paying without the payment being reversed
// (that only happens via a Refund), so these two disagree often enough that
// both need to be visible side by side on the Payments tab.
const PAYMENT_BOOKING_STATUS_COLOR = {
  PENDING: 'warning', SUCCESS: 'success', CANCELLED: 'dark', FAILED: 'danger', REJECTED: 'secondary',
}

const ASSIGNMENT_STATUS_COLOR = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  LOCKED: 'primary',
  COMPLETED: 'dark',
  CANCELLED: 'danger',
  REJECTED: 'danger',
  BACKED_OUT: 'secondary',
}
const ASSIGNMENT_PAYMENT_COLOR = {
  NONE: 'secondary',
  PENDING: 'warning',
  PARTIAL: 'info',
  PAID: 'success',
}
const PAYOUT_STATUS_COLOR = {
  SCHEDULED: 'secondary',
  READY: 'primary',
  PROCESSING: 'info',
  SUCCESS: 'success',
  FAILED: 'danger',
  ON_HOLD: 'warning',
  CANCELLED: 'dark',
}

const INTERACTION_ICON = {
  VIEW: cilSearch,
  FAVORITE: cilBookmark,
  UNFAVORITE: cilBookmark,
  SHARE: cilShareAll,
  BOOK: cilCalendar,
  RATE: cilStar,
  REVIEW: cilStar,
  SEARCH: cilSearch,
  COMPLETE: cilCalendar,
}

const NOTIFY_PRESETS = [
  { value: 'MARKETING_UPDATE_NOTIFICATION', label: 'General Info / Announcement' },
  { value: 'PAYMENT_REMINDER', label: 'Payment Reminder' },
  { value: 'TRIP_UPDATED', label: 'Trip Update Notice' },
  { value: 'USER_EXIT', label: 'Account Notice (Suspension Warning)' },
]

const fmt = (minor) => (minor == null ? '-' : formatRupees(minor))

const InfoRow = ({ label, value }) => (
  <CListGroupItem className="d-flex justify-content-between align-items-start py-2 px-0 border-start-0 border-end-0">
    <span className="text-muted small">{label}</span>
    <span
      className="small fw-semibold text-end"
      style={{ maxWidth: '65%', wordBreak: 'break-all' }}
    >
      {value ?? '-'}
    </span>
  </CListGroupItem>
)

const StatCard = ({ label, value, color = 'primary' }) => (
  <div className="text-center px-3 py-2 border-end">
    <div className={`fw-bold fs-5 text-${color}`}>{value ?? 0}</div>
    <div className="small text-muted">{label}</div>
  </div>
)

// -- Right-side action panel --------------------------------------------------

const ACTIVITY_PAGE = 5

const ActionPanel = ({ user, id, qc }) => {
  const navigate = useNavigate()
  const [statusModal, setStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [reason, setReason] = useState('')
  const [statusError, setStatusError] = useState(null)

  const [hardDeleteModal, setHardDeleteModal] = useState(false)
  const [hardDeleteReason, setHardDeleteReason] = useState('')
  const [hardDeleteError, setHardDeleteError] = useState(null)

  const [activityOffset, setActivityOffset] = useState(0)

  const {
    data: activityData,
    isLoading: interactionsLoading,
    isFetching: interactionsFetching,
  } = useQuery({
    queryKey: ['admin-user-interactions', id, activityOffset],
    queryFn: async () => {
      const res = await api.get(
        `/api/admin/users/${id}/interactions?limit=${ACTIVITY_PAGE}&offset=${activityOffset}`,
      )
      return res.data.data
    },
    keepPreviousData: true,
  })

  const interactions = activityData?.interactions || []
  const activityTotal = activityData?.total || 0
  const hasMore = activityOffset + ACTIVITY_PAGE < activityTotal
  const hasPrev = activityOffset > 0

  const statusMut = useMutation({
    mutationFn: ({ status, reason }) =>
      api.patch(`/api/admin/users/${id}/status`, { status, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setStatusModal(false)
      setReason('')
      setStatusError(null)
    },
    onError: (err) => setStatusError(err.response?.data?.message || 'Failed to update status'),
  })

  const handleStatusSubmit = () => {
    if (!newStatus || !reason.trim()) {
      setStatusError('Status and reason are required')
      return
    }
    statusMut.mutate({ status: newStatus, reason })
  }

  const hardDeleteMut = useMutation({
    mutationFn: (reason) => api.post(`/api/admin/users/${id}/hard-delete`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setHardDeleteModal(false)
      setHardDeleteReason('')
      setHardDeleteError(null)
    },
    onError: (err) => setHardDeleteError(err.response?.data?.message || 'Failed to hard-delete user'),
  })

  const handleHardDeleteSubmit = () => {
    if (!hardDeleteReason.trim()) {
      setHardDeleteError('Reason is required')
      return
    }
    hardDeleteMut.mutate(hardDeleteReason)
  }

  return (
    <>
      {/* Status */}
      <CCard className="mb-3 shadow-sm">
        <CCardHeader className="py-2">
          <strong className="small">Account Status</strong>
        </CCardHeader>
        <CCardBody className="pb-2">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <CBadge color={STATUS_COLOR[user.accountStatus] || 'secondary'} className="px-2 py-1">
              {user.accountStatus}
            </CBadge>
            <CButton
              size="sm"
              color="outline-primary"
              onClick={() => {
                setNewStatus(user.accountStatus)
                setStatusError(null)
                setStatusModal(true)
              }}
            >
              <CIcon icon={cilPencil} size="sm" className="me-1" />
              Change
            </CButton>
          </div>
          <div className="d-flex flex-column gap-1">
            <CButton
              size="sm"
              color="outline-secondary"
              onClick={() => navigate('/payments?userId=' + id)}
            >
              <CIcon icon={cilMoney} size="sm" className="me-1" />
              View Payments
            </CButton>
            {user.accountStatus === 'PENDING_DELETION' && (
              <CButton
                size="sm"
                color="outline-danger"
                onClick={() => {
                  setHardDeleteReason('')
                  setHardDeleteError(null)
                  setHardDeleteModal(true)
                }}
              >
                <CIcon icon={cilTrash} size="sm" className="me-1" />
                Hard Delete
              </CButton>
            )}
          </div>
        </CCardBody>
      </CCard>

      {/* Recent Activity */}
      <CCard className="mb-3 shadow-sm">
        <CCardHeader className="py-2 d-flex justify-content-between align-items-center">
          <div>
            <strong className="small">Recent Activity</strong>
            {activityTotal > 0 && (
              <span className="text-muted small ms-1">
                ({activityOffset + 1}–{Math.min(activityOffset + ACTIVITY_PAGE, activityTotal)} of{' '}
                {activityTotal})
              </span>
            )}
          </div>
          {interactionsFetching && !interactionsLoading && <CSpinner size="sm" />}
        </CCardHeader>
        <CCardBody className="p-0">
          {interactionsLoading ? (
            <div className="text-center py-3">
              <CSpinner size="sm" />
            </div>
          ) : interactions.length > 0 ? (
            <>
              {interactions.map((i) => (
                <div key={i.id} className="d-flex align-items-start gap-2 px-3 py-2 border-bottom">
                  <CIcon
                    icon={INTERACTION_ICON[i.action] || cilHistory}
                    size="sm"
                    className="text-muted mt-1 flex-shrink-0"
                  />
                  <div className="flex-grow-1 min-w-0">
                    <div className="small fw-semibold">
                      {i.action} <span className="fw-normal text-muted">{i.entityType}</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {fmtDateTime(i.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              {(hasPrev || hasMore) && (
                <div className="d-flex justify-content-between px-3 py-2">
                  <CButton
                    size="sm"
                    color="link"
                    className="p-0 small"
                    disabled={!hasPrev}
                    onClick={() => setActivityOffset((o) => Math.max(0, o - ACTIVITY_PAGE))}
                  >
                    ← Prev
                  </CButton>
                  <CButton
                    size="sm"
                    color="link"
                    className="p-0 small"
                    disabled={!hasMore}
                    onClick={() => setActivityOffset((o) => o + ACTIVITY_PAGE)}
                  >
                    Next →
                  </CButton>
                </div>
              )}
            </>
          ) : (
            <div className="text-muted small text-center py-3">No activity recorded.</div>
          )}
        </CCardBody>
      </CCard>

      {/* Change Status Modal */}
      <CModal
        visible={statusModal}
        onClose={() => {
          setStatusModal(false)
          setStatusError(null)
        }}
      >
        <CModalHeader>
          <CModalTitle>Update Account Status</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {statusError && (
            <CAlert color="danger" className="py-2 small mb-3">
              {statusError}
            </CAlert>
          )}
          <div className="mb-3">
            <label className="form-label small fw-semibold">New Status</label>
            <CFormSelect value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="">Select status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
              <option value="DEACTIVATED">Deactivated</option>
            </CFormSelect>
          </div>
          <div>
            <label className="form-label small fw-semibold">
              Reason <span className="text-danger">*</span>
            </label>
            <CFormTextarea
              rows={3}
              placeholder="Provide a reason for this status change."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => {
              setStatusModal(false)
              setStatusError(null)
            }}
          >
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleStatusSubmit} disabled={statusMut.isLoading}>
            {statusMut.isLoading ? <CSpinner size="sm" className="me-1" /> : null}
            Confirm
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Hard Delete Modal */}
      <CModal
        visible={hardDeleteModal}
        onClose={() => {
          setHardDeleteModal(false)
          setHardDeleteError(null)
        }}
      >
        <CModalHeader>
          <CModalTitle>Hard Delete User</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {hardDeleteError && (
            <CAlert color="danger" className="py-2 small mb-3">
              {hardDeleteError}
            </CAlert>
          )}
          <CAlert color="warning" className="py-2 small mb-3">
            This permanently anonymizes {user.name}'s profile (name, email, phone,
            documents, portfolio) and deletes their photos/media, favorites, and
            device tokens. Trip and payment history is kept but de-identified —
            this cannot be undone.
          </CAlert>
          <div>
            <label className="form-label small fw-semibold">
              Reason <span className="text-danger">*</span>
            </label>
            <CFormTextarea
              rows={3}
              placeholder="Provide a reason for this hard delete."
              value={hardDeleteReason}
              onChange={(e) => setHardDeleteReason(e.target.value)}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => {
              setHardDeleteModal(false)
              setHardDeleteError(null)
            }}
          >
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleHardDeleteSubmit} disabled={hardDeleteMut.isLoading}>
            {hardDeleteMut.isLoading ? <CSpinner size="sm" className="me-1" /> : null}
            Permanently Delete
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

// -- Main component -----------------------------------------------------------

const UserDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')

  // SP destination modal
  const [spDestModal, setSpDestModal] = useState(false)
  const [spDestSearch, setSpDestSearch] = useState('')
  const [spDestSelected, setSpDestSelected] = useState('')
  const [spHotspotSelected, setSpHotspotSelected] = useState('')
  const [spGatesSelected, setSpGatesSelected] = useState([])
  const [spDestError, setSpDestError] = useState(null)

  // Edit-gates modal — scoping an already-linked SP-destination to specific
  // gates (empty selection = serves the whole destination broadly).
  const [spEditGatesModal, setSpEditGatesModal] = useState(null) // the spd row being edited, or null
  const [spEditGatesSelected, setSpEditGatesSelected] = useState([])
  const [spEditGatesError, setSpEditGatesError] = useState(null)

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/users/${id}`)
      return res.data.data
    },
  })

  // Trips tab — own paginated fetch (not the bootstrap's capped createdTrips
  // sub-list) so all of a user's trips are reachable, not just the first 20.
  const [tripsPage, setTripsPage] = useState(1)
  const [tripsPageSize, setTripsPageSize] = useState(20)
  const { data: tripsData, isLoading: tripsLoading } = useQuery({
    queryKey: ['admin-user-trips', id, tripsPage, tripsPageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        createdByUserId: id,
        limit: tripsPageSize,
        offset: (tripsPage - 1) * tripsPageSize,
      })
      const res = await api.get(`/api/admin/trips?${params}`)
      return res.data.data
    },
    enabled: activeTab === 'trips',
    placeholderData: (prev) => prev,
  })

  const addSPDestMut = useMutation({
    mutationFn: ({ destinationId, primaryHotspotId, destinationGatesID }) =>
      api.post(`/api/admin/users/${id}/sp-destinations`, {
        destinationId,
        primaryHotspotId: primaryHotspotId || undefined,
        destinationGatesID: destinationGatesID?.length ? destinationGatesID : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] })
      setSpDestModal(false)
      setSpDestSelected('')
      setSpHotspotSelected('')
      setSpGatesSelected([])
      setSpDestError(null)
    },
    onError: (err) => setSpDestError(err.response?.data?.message || 'Failed to add destination'),
  })

  const removeSPDestMut = useMutation({
    mutationFn: (spdId) => api.delete(`/api/admin/sp-destinations/${spdId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-user', id] }),
  })

  const updateSPDestGatesMut = useMutation({
    mutationFn: ({ spdId, destinationGatesID }) =>
      api.patch(`/api/admin/sp-destinations/${spdId}/gates`, { destinationGatesID }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] })
      setSpEditGatesModal(null)
      setSpEditGatesError(null)
    },
    onError: (err) => setSpEditGatesError(err.response?.data?.message || 'Failed to update gates'),
  })

  const { data: destSearchData } = useQuery({
    queryKey: ['admin-destinations-search', spDestSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20', offset: '0' })
      if (spDestSearch) params.set('search', spDestSearch)
      const res = await api.get(`/api/admin/destinations?${params}`)
      return res.data.data?.destinations || []
    },
    enabled: spDestModal,
  })

  const { data: destHotspots = [] } = useQuery({
    queryKey: ['admin-dest-hotspots', spDestSelected],
    queryFn: async () => {
      const res = await api.get(`/api/admin/destinations/${spDestSelected}/hotspots`)
      return res.data.data || []
    },
    enabled: !!spDestSelected,
  })

  const { data: destGates = [] } = useQuery({
    queryKey: ['admin-dest-gates', spDestSelected],
    queryFn: async () => {
      const res = await api.get(`/api/admin/destinations/${spDestSelected}/gates`)
      return res.data.data || []
    },
    enabled: !!spDestSelected,
  })

  const { data: editDestGates = [] } = useQuery({
    queryKey: ['admin-dest-gates', spEditGatesModal?.destination?.id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/destinations/${spEditGatesModal.destination.id}/gates`)
      return res.data.data || []
    },
    enabled: !!spEditGatesModal?.destination?.id,
  })

  if (isLoading)
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  if (isError || !user) return <CAlert color="danger">Failed to load user.</CAlert>

  // Use the denormalized aggregate — `receivedReviews` is capped at 10 rows
  // server-side, so averaging it directly would be wrong for anyone with more.
  const avgRating = user.avgRating != null ? user.avgRating.toFixed(1) : null
  const reviewCount = user.reviewCount ?? 0
  const favoritesReceivedCount = user.favoritesCount ?? 0

  const isSP = user.role === 'SERVICE_PROVIDER'
  const isTM = user.role === 'TRIP_MANAGER'
  const isPG = user.role === 'PHOTOGRAPHER'
  const hasPayouts = isTM || isSP || isPG
  const TABS = [
    'Profile',
    'Details',
    'Trips',
    ...(isPG ? ['Payments'] : []),
    ...(!isTM ? [isSP ? 'Assignments' : 'Bookings'] : []),
    'Reviews',
    ...(hasPayouts ? ['Payouts'] : []),
    'Gallery',
  ]

  return (
    <>
      {/* Header Card */}
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
            <div className="flex-shrink-0">
              {user.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt=""
                  style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: '#321fdb',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    fontWeight: 700,
                  }}
                >
                  {(user.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-grow-1 min-w-0">
              <h5 className="mb-1 fw-bold">{user.name || '(No name)'}</h5>
              <div className="small text-muted mb-1">
                {user.email}
                {user.phone && ` - ${user.phone}`}
              </div>
              <div className="d-flex gap-2 flex-wrap align-items-center">
                <CBadge color="primary">{user.role?.replace('_', ' ')}</CBadge>
                <CBadge color={STATUS_COLOR[user.accountStatus] || 'secondary'}>
                  {user.accountStatus}
                </CBadge>
                {user.verified && <CBadge color="info">Verified</CBadge>}
                {avgRating && (
                  <CBadge color="warning" textColor="dark">
                    ★ {avgRating}
                  </CBadge>
                )}
              </div>
            </div>
          </div>

          <div className="d-flex flex-wrap mt-3 border-top pt-3" style={{ gap: 0 }}>
            <StatCard label="Trips" value={user._count?.createdTrips} />
            {isPG && (
              <StatCard label="Payments" value={user._count?.paymentsSent} color="success" />
            )}
            <StatCard label="Bookings" value={user._count?.bookingParticipants} color="info" />
            <StatCard label="Reviews" value={user._count?.receivedReviews} color="warning" />
            {isSP && (
              <StatCard
                label="Assignments"
                value={user._count?.tripProviderAssignmentsAsProvider}
                color="primary"
              />
            )}
            {hasPayouts && (
              <StatCard label="Payouts" value={user._count?.payouts} color="success" />
            )}
            <StatCard label="Favourites" value={user._count?.favorites} color="secondary" />
            {(isPG || isSP) && (
              <StatCard label="Favorited By" value={favoritesReceivedCount} color="secondary" />
            )}
            <div className="text-center px-3 py-2">
              <div className="fw-bold fs-5 text-muted">{fmtDate(user.createdAt)}</div>
              <div className="small text-muted">Joined</div>
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* Main 2-column layout */}
      <CRow className="g-3 align-items-start">
        {/* Left — tabs */}
        <CCol xl={9}>
          <CCard>
            <CCardHeader className="pb-0">
              <CNav variant="underline-border">
                {TABS.map((tab) => (
                  <CNavItem key={tab}>
                    <CNavLink
                      active={activeTab === tab.toLowerCase()}
                      onClick={() => setActiveTab(tab.toLowerCase())}
                      style={{ cursor: 'pointer' }}
                    >
                      {tab}
                    </CNavLink>
                  </CNavItem>
                ))}
              </CNav>
            </CCardHeader>

            <CCardBody>
              <CTabContent>
                {/* Profile */}
                <CTabPane visible={activeTab === 'profile'}>
                  <CRow>
                    <CCol md={6}>
                      <CListGroup flush>
                        <InfoRow label="User ID" value={<code className="small">{user.id}</code>} />
                        <InfoRow label="Name" value={user.name} />
                        <InfoRow label="Email" value={user.email} />
                        <InfoRow label="Phone" value={user.phone} />
                        <InfoRow label="Location" value={user.location} />
                      </CListGroup>
                    </CCol>
                    <CCol md={6}>
                      <CListGroup flush>
                        <InfoRow label="Role" value={user.role} />
                        <InfoRow
                          label="Status"
                          value={
                            <CBadge color={STATUS_COLOR[user.accountStatus] || 'secondary'}>
                              {user.accountStatus}
                            </CBadge>
                          }
                        />
                        <InfoRow label="Email Verified" value={user.verified ? 'Yes' : 'No'} />
                        <InfoRow label="Joined" value={fmtDateTime(user.createdAt)} />
                        <InfoRow label="Last Updated" value={fmtDateTime(user.updatedAt)} />
                      </CListGroup>
                    </CCol>
                  </CRow>
                  {user.bio && (
                    <div className="mt-3 p-3 bg-body-secondary rounded small">
                      <div className="text-muted fw-semibold mb-1">Bio</div>
                      {user.bio}
                    </div>
                  )}
                </CTabPane>

                {/* Details (role-specific) */}
                <CTabPane visible={activeTab === 'details'}>
                  {user.role === 'PHOTOGRAPHER' && user.photographer ? (
                    <CListGroup flush>
                      <InfoRow
                        label="Preferred Genres"
                        value={user.photographer.preferredGenres?.join(', ')}
                      />
                      <InfoRow label="Years Experience" value={user.photographer.yearsExperience} />
                      <InfoRow
                        label="Preferred Trip Type"
                        value={user.photographer.preferredTripType}
                      />
                      <InfoRow label="Equipment" value={user.photographer.equipment} />
                      <InfoRow label="Portfolio URL" value={user.photographer.portfolioUrl} />
                    </CListGroup>
                  ) : user.role === 'TRIP_MANAGER' && user.tripManager ? (
                    <CListGroup flush>
                      <InfoRow label="Agency" value={user.tripManager.agencyName} />
                      <InfoRow label="Experience Years" value={user.tripManager.experienceYears} />
                      <InfoRow
                        label="Operating Regions"
                        value={user.tripManager.operatingRegions?.join(', ')}
                      />
                      <InfoRow label="Max Group Size" value={user.tripManager.maxGroupSize} />
                      <InfoRow
                        label="Specializations"
                        value={user.tripManager.specializations?.join(', ')}
                      />
                    </CListGroup>
                  ) : user.role === 'SERVICE_PROVIDER' && user.serviceProvider ? (
                    <>
                      <CRow>
                        <CCol md={6}>
                          <CListGroup flush>
                            <InfoRow
                              label="Business Name"
                              value={user.serviceProvider.businessName}
                            />
                            <InfoRow label="Type" value={user.serviceProvider.type} />
                            <InfoRow
                              label="Profile Status"
                              value={
                                <CBadge
                                  color={
                                    user.serviceProvider.profileStatus === 'APPROVED'
                                      ? 'success'
                                      : 'warning'
                                  }
                                >
                                  {user.serviceProvider.profileStatus}
                                </CBadge>
                              }
                            />
                            <InfoRow
                              label="SP Verified"
                              value={user.serviceProvider.verified ? 'Yes' : 'No'}
                            />
                          </CListGroup>
                        </CCol>
                        <CCol md={6}>
                          <CListGroup flush>
                            <InfoRow
                              label="Rating"
                              value={
                                user.serviceProvider.rating
                                  ? `★ ${user.serviceProvider.rating}`
                                  : null
                              }
                            />
                            <InfoRow
                              label="Licensed"
                              value={user.serviceProvider.licensed ? 'Yes' : 'No'}
                            />
                            <InfoRow
                              label="Languages"
                              value={user.serviceProvider.languagesSpoken?.join(', ')}
                            />
                            <InfoRow
                              label="Experience Years"
                              value={user.serviceProvider.yearsExperience}
                            />
                          </CListGroup>
                        </CCol>
                      </CRow>
                      <div className="mt-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-semibold small">
                            Operating Destinations ({user.serviceProviderDestinations?.length || 0})
                          </span>
                          <CButton
                            size="sm"
                            color="primary"
                            onClick={() => {
                              setSpDestModal(true)
                              setSpDestError(null)
                              setSpDestSelected('')
                              setSpHotspotSelected('')
                              setSpGatesSelected([])
                            }}
                          >
                            <CIcon icon={cilPlus} className="me-1" size="sm" />
                            Add Destination
                          </CButton>
                        </div>
                        {user.serviceProviderDestinations?.length > 0 ? (
                          <CTable small hover responsive>
                            <CTableHead color="light">
                              <CTableRow>
                                <CTableHeaderCell>Destination</CTableHeaderCell>
                                <CTableHeaderCell>Country</CTableHeaderCell>
                                <CTableHeaderCell>Region / State</CTableHeaderCell>
                                <CTableHeaderCell>Gates</CTableHeaderCell>
                                <CTableHeaderCell>Action</CTableHeaderCell>
                              </CTableRow>
                            </CTableHead>
                            <CTableBody>
                              {user.serviceProviderDestinations.map((spd) => (
                                <CTableRow key={spd.id}>
                                  <CTableDataCell
                                    className="small fw-semibold"
                                    style={
                                      spd.destination?.id
                                        ? { cursor: 'pointer', color: 'var(--cui-primary)' }
                                        : undefined
                                    }
                                    onClick={() =>
                                      spd.destination?.id &&
                                      navigate('/destinations/' + spd.destination.id)
                                    }
                                  >
                                    {spd.destination?.name || 'User-defined'}
                                  </CTableDataCell>
                                  <CTableDataCell className="small text-muted">
                                    {spd.destination?.country || '-'}
                                  </CTableDataCell>
                                  <CTableDataCell className="small text-muted">
                                    {[spd.destination?.region, spd.destination?.state]
                                      .filter(Boolean)
                                      .join(', ') || '-'}
                                  </CTableDataCell>
                                  <CTableDataCell className="small">
                                    {spd.destinationGatesID?.length > 0 ? (
                                      <CBadge color="info">
                                        {spd.destinationGatesID.length} gate
                                        {spd.destinationGatesID.length !== 1 ? 's' : ''}
                                      </CBadge>
                                    ) : (
                                      <CBadge color="secondary">Whole destination</CBadge>
                                    )}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    <div className="d-flex gap-1">
                                      {spd.destination?.id && (
                                        <CButton
                                          size="sm"
                                          color="outline-primary"
                                          onClick={() => {
                                            setSpEditGatesModal(spd)
                                            setSpEditGatesSelected(spd.destinationGatesID || [])
                                            setSpEditGatesError(null)
                                          }}
                                        >
                                          <CIcon icon={cilPencil} size="sm" className="me-1" />
                                          Gates
                                        </CButton>
                                      )}
                                      <CButton
                                        size="sm"
                                        color="outline-danger"
                                        onClick={() =>
                                          window.confirm(
                                            `Remove ${spd.destination?.name} from this SP?`,
                                          ) && removeSPDestMut.mutate(spd.id)
                                        }
                                      >
                                        <CIcon icon={cilTrash} size="sm" className="me-1" />
                                        Remove
                                      </CButton>
                                    </div>
                                  </CTableDataCell>
                                </CTableRow>
                              ))}
                            </CTableBody>
                          </CTable>
                        ) : (
                          <div className="small text-muted py-2">
                            No operating destinations assigned yet.
                          </div>
                        )}
                      </div>
                      {user.serviceDetailsByProviderUser?.length > 0 && (
                        <div className="mt-3">
                          <div className="fw-semibold small mb-2">Active Services</div>
                          <CTable small hover responsive>
                            <CTableHead color="light">
                              <CTableRow>
                                <CTableHeaderCell>Title</CTableHeaderCell>
                                <CTableHeaderCell>Type</CTableHeaderCell>
                                <CTableHeaderCell>Amount</CTableHeaderCell>
                                <CTableHeaderCell>Action</CTableHeaderCell>
                              </CTableRow>
                            </CTableHead>
                            <CTableBody>
                              {user.serviceDetailsByProviderUser.map((sd) => (
                                <CTableRow key={sd.id}>
                                  <CTableDataCell className="small fw-semibold">
                                    {sd.title}
                                  </CTableDataCell>
                                  <CTableDataCell className="small">
                                    {sd.serviceType}
                                  </CTableDataCell>
                                  <CTableDataCell className="small">
                                    {sd.priceMinor != null
                                      ? `${fmt(sd.priceMinor)} / ${sd.priceUnit || 'unit'}`
                                      : '-'}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    <CButton
                                      size="sm"
                                      color="outline-primary"
                                      onClick={() => navigate('/services/' + sd.id)}
                                    >
                                      <CIcon icon={cilZoomIn} size="sm" className="me-1" />
                                      View
                                    </CButton>
                                  </CTableDataCell>
                                </CTableRow>
                              ))}
                            </CTableBody>
                          </CTable>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted small py-3">No role profile data found.</p>
                  )}

                  {user.verificationDocuments?.length > 0 && (
                    <div className="mt-4">
                      <div className="fw-semibold small mb-2">
                        Identity Verification ({user.verificationDocuments.length})
                      </div>
                      <div className="d-flex flex-column gap-2">
                        {user.verificationDocuments.map((doc) => (
                          <div key={doc.id} className="p-3 bg-body-secondary rounded">
                            <div className="d-flex justify-content-between align-items-start mb-1">
                              <div className="small fw-semibold text-capitalize">
                                {humanizeDocType(doc.docType)}
                              </div>
                              <CBadge
                                color={DOC_STATUS_COLOR[doc.verificationStatus] || 'secondary'}
                              >
                                {doc.verificationStatus}
                              </CBadge>
                            </div>
                            {doc.verificationStatus === 'REJECTED' && doc.rejectionReason && (
                              <div className="small text-danger mb-1">
                                Reason: {doc.rejectionReason}
                              </div>
                            )}
                            {doc.media?.length > 0 && (
                              <div className="d-flex gap-2 mt-1">
                                {doc.media.map((m) => (
                                  <a
                                    key={m.id}
                                    href={m.viewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="small"
                                  >
                                    {m.mimeType?.startsWith('image/') ? 'View image' : 'View file'}
                                  </a>
                                ))}
                              </div>
                            )}
                            {doc.verificationStatus === 'PENDING' && (
                              <CButton
                                size="sm"
                                color="link"
                                className="p-0 mt-1"
                                onClick={() => navigate('/verification/documents')}
                              >
                                Review in Verification Queue
                              </CButton>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CTabPane>

                {/* Trips */}
                <CTabPane visible={activeTab === 'trips'}>
                  {tripsLoading && !tripsData ? (
                    <div className="text-center py-4">
                      <CSpinner size="sm" />
                    </div>
                  ) : tripsData?.trips?.length > 0 ? (
                    <>
                      <CTable small hover responsive>
                        <CTableHead color="light">
                          <CTableRow>
                            <CTableHeaderCell>#</CTableHeaderCell>
                            <CTableHeaderCell>Title</CTableHeaderCell>
                            <CTableHeaderCell>Status</CTableHeaderCell>
                            <CTableHeaderCell>Participants</CTableHeaderCell>
                            <CTableHeaderCell>Created</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {tripsData.trips.map((t, idx) => (
                            <CTableRow key={t.id}>
                              <CTableDataCell className="small text-muted">
                                {(tripsPage - 1) * tripsPageSize + idx + 1}
                              </CTableDataCell>
                              <CTableDataCell className="small fw-semibold">
                                <span
                                  role="button"
                                  className="text-primary"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => navigate(`/trips/${t.id}`)}
                                >
                                  {t.title}
                                </span>
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color={TRIP_STATUS_COLOR[t.status] || 'secondary'}>
                                  {t.status}
                                </CBadge>
                              </CTableDataCell>
                              <CTableDataCell className="small text-center">
                                {t._count?.participants ?? '-'}
                              </CTableDataCell>
                              <CTableDataCell className="small text-muted">
                                {fmtDate(t.createdAt)}
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                      <AdminTableFooter
                        total={tripsData.total}
                        page={tripsPage}
                        pageSize={tripsPageSize}
                        onPageChange={setTripsPage}
                        onPageSizeChange={(size) => {
                          setTripsPageSize(size)
                          setTripsPage(1)
                        }}
                      />
                    </>
                  ) : (
                    <EmptyState message="No trips created by this user." />
                  )}
                </CTabPane>

                {/* Payments */}
                <CTabPane visible={activeTab === 'payments'}>
                  {user.paymentsSent?.length > 0 ? (
                    <>
                      <div className="d-flex gap-3 mb-3">
                        <div className="text-muted small">
                          Total payments: <strong>{user._count?.paymentsSent}</strong>
                          {user.paymentsSent.length < user._count?.paymentsSent &&
                            ' (showing latest 20)'}
                        </div>
                      </div>
                      <CTable small hover responsive>
                        <CTableHead color="light">
                          <CTableRow>
                            <CTableHeaderCell>#</CTableHeaderCell>
                            <CTableHeaderCell>Trip</CTableHeaderCell>
                            <CTableHeaderCell>Amount</CTableHeaderCell>
                            <CTableHeaderCell>Platform Fee</CTableHeaderCell>
                            <CTableHeaderCell>Total</CTableHeaderCell>
                            <CTableHeaderCell>Method</CTableHeaderCell>
                            <CTableHeaderCell>Status</CTableHeaderCell>
                            <CTableHeaderCell>Booking Status</CTableHeaderCell>
                            <CTableHeaderCell>Date</CTableHeaderCell>
                            <CTableHeaderCell></CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {user.paymentsSent.map((p, idx) => (
                            <CTableRow key={p.id}>
                              <CTableDataCell className="small text-muted">
                                {idx + 1}
                              </CTableDataCell>
                              <CTableDataCell className="small fw-semibold">
                                {p.trip?.id ? (
                                  <span
                                    role="button"
                                    className="text-primary"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/trips/${p.trip.id}`)}
                                  >
                                    {p.trip.title || p.trip.id}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </CTableDataCell>
                              <CTableDataCell className="small">
                                {fmt(p.amountMinor)}
                              </CTableDataCell>
                              <CTableDataCell className="small text-muted">
                                {fmt(p.platformFeeMinor)}
                              </CTableDataCell>
                              <CTableDataCell className="small fw-semibold">
                                {fmt(p.totalAmountMinor)}
                              </CTableDataCell>
                              <CTableDataCell className="small">
                                {p.paymentMethod || '-'}
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color={PAYMENT_STATUS_COLOR[p.status] || 'secondary'}>
                                  {p.status}
                                </CBadge>
                              </CTableDataCell>
                              <CTableDataCell>
                                {p.participant?.status ? (
                                  <CBadge color={PAYMENT_BOOKING_STATUS_COLOR[p.participant.status] || 'secondary'}>
                                    {p.participant.status}
                                  </CBadge>
                                ) : (
                                  <span className="text-muted small">-</span>
                                )}
                              </CTableDataCell>
                              <CTableDataCell className="small text-muted">
                                {fmtDate(p.createdAt)}
                              </CTableDataCell>
                              <CTableDataCell>
                                <CButton
                                  size="sm"
                                  color="outline-primary"
                                  onClick={() => navigate(`/payments/${p.id}`)}
                                >
                                  <CIcon icon={cilZoomIn} size="sm" />
                                </CButton>
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    </>
                  ) : (
                    <EmptyState message="No payments found for this user." />
                  )}
                </CTabPane>

                {/* Bookings */}
                <CTabPane visible={activeTab === 'bookings'}>
                  {user.bookingParticipants?.length > 0 ? (
                    <>
                      <div className="text-muted small mb-3">
                        Total bookings: <strong>{user._count?.bookingParticipants}</strong>
                        {user.bookingParticipants.length < user._count?.bookingParticipants &&
                          ' (showing latest 20)'}
                      </div>
                      <CTable small hover responsive>
                        <CTableHead color="light">
                          <CTableRow>
                            <CTableHeaderCell>#</CTableHeaderCell>
                            <CTableHeaderCell>Trip</CTableHeaderCell>
                            <CTableHeaderCell>Trip Status</CTableHeaderCell>
                            <CTableHeaderCell>Booking Status</CTableHeaderCell>
                            <CTableHeaderCell>Role</CTableHeaderCell>
                            <CTableHeaderCell>Booked On</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {user.bookingParticipants.map((b, idx) => (
                            <CTableRow key={b.id}>
                              <CTableDataCell className="small text-muted">
                                {idx + 1}
                              </CTableDataCell>
                              <CTableDataCell className="small fw-semibold">
                                {b.trip?.title || '-'}
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color={TRIP_STATUS_COLOR[b.trip?.status] || 'secondary'}>
                                  {b.trip?.status || '-'}
                                </CBadge>
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color={BOOKING_STATUS_COLOR[b.status] || 'secondary'}>
                                  {b.status || '-'}
                                </CBadge>
                              </CTableDataCell>
                              <CTableDataCell className="small">{b.role || '-'}</CTableDataCell>
                              <CTableDataCell className="small text-muted">
                                {fmtDate(b.createdAt)}
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    </>
                  ) : (
                    <EmptyState message="No bookings found for this user." />
                  )}
                </CTabPane>

                {/* Reviews */}
                <CTabPane visible={activeTab === 'reviews'}>
                  {user.receivedReviews?.length > 0 ? (
                    <>
                      {avgRating && (
                        <div className="mb-3 d-flex align-items-center gap-2">
                          <span className="fs-4 fw-bold text-warning">★ {avgRating}</span>
                          <span className="text-muted small">
                            average from {reviewCount} review{reviewCount === 1 ? '' : 's'}
                            {user.receivedReviews.length < reviewCount &&
                              ` (showing latest ${user.receivedReviews.length})`}
                          </span>
                        </div>
                      )}
                      <div className="d-flex flex-column gap-3">
                        {user.receivedReviews.map((r) => (
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
                                  {(r.reviewer?.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <span className="small fw-semibold">
                                  {r.reviewer?.name || 'Anonymous'}
                                </span>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <CBadge color="warning" textColor="dark">
                                  ★ {r.rating}
                                </CBadge>
                                <span className="small text-muted">{fmtDate(r.createdAt)}</span>
                              </div>
                            </div>
                            {r.comment && <p className="small mb-0 mt-1 text-body">{r.comment}</p>}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <EmptyState message="No reviews yet." />
                  )}
                </CTabPane>

                {/* Assignments — SP only */}
                <CTabPane visible={activeTab === 'assignments'}>
                  {user.tripProviderAssignmentsAsProvider?.length > 0 ? (
                    <>
                      <div className="text-muted small mb-3">
                        Total assignments:{' '}
                        <strong>{user._count?.tripProviderAssignmentsAsProvider}</strong>
                        {user.tripProviderAssignmentsAsProvider.length <
                          user._count?.tripProviderAssignmentsAsProvider && ' (showing latest 30)'}
                      </div>
                      <CTable small hover responsive>
                        <CTableHead color="light">
                          <CTableRow>
                            <CTableHeaderCell>#</CTableHeaderCell>
                            <CTableHeaderCell>Trip</CTableHeaderCell>
                            <CTableHeaderCell>Service</CTableHeaderCell>
                            <CTableHeaderCell>Period</CTableHeaderCell>
                            <CTableHeaderCell>Status</CTableHeaderCell>
                            <CTableHeaderCell>Payment</CTableHeaderCell>
                            <CTableHeaderCell>Amount</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {user.tripProviderAssignmentsAsProvider.map((a, idx) => (
                            <CTableRow key={a.id}>
                              <CTableDataCell className="small text-muted">
                                {idx + 1}
                              </CTableDataCell>
                              <CTableDataCell className="small fw-semibold">
                                <span
                                  role="button"
                                  className="text-primary"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => navigate(`/trips/${a.trip.id}`)}
                                >
                                  {a.trip?.title || '-'}
                                </span>
                              </CTableDataCell>
                              <CTableDataCell className="small">{a.serviceType}</CTableDataCell>
                              <CTableDataCell className="small text-muted">
                                {fmtDate(a.startDate)} – {fmtDate(a.endDate)}
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge
                                  color={ASSIGNMENT_STATUS_COLOR[a.assignmentStatus] || 'secondary'}
                                >
                                  {a.assignmentStatus}
                                </CBadge>
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge
                                  color={ASSIGNMENT_PAYMENT_COLOR[a.paymentStatus] || 'secondary'}
                                >
                                  {a.paymentStatus}
                                </CBadge>
                              </CTableDataCell>
                              <CTableDataCell className="small">
                                {fmt(a.agreedAmountMinor)}
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    </>
                  ) : (
                    <EmptyState message="No trip assignments found for this provider." />
                  )}
                </CTabPane>

                {/* Payouts — TM / PG / SP */}
                <CTabPane visible={activeTab === 'payouts'}>
                  {user.payouts?.length > 0 ? (
                    <>
                      <div className="text-muted small mb-3">
                        Total payouts: <strong>{user._count?.payouts}</strong>
                        {user.payouts.length < user._count?.payouts && ' (showing latest 20)'}
                      </div>
                      <CTable small hover responsive>
                        <CTableHead color="light">
                          <CTableRow>
                            <CTableHeaderCell>#</CTableHeaderCell>
                            <CTableHeaderCell>Trip</CTableHeaderCell>
                            <CTableHeaderCell>Role</CTableHeaderCell>
                            <CTableHeaderCell>Amount</CTableHeaderCell>
                            <CTableHeaderCell>Net</CTableHeaderCell>
                            <CTableHeaderCell>Method</CTableHeaderCell>
                            <CTableHeaderCell>Status</CTableHeaderCell>
                            <CTableHeaderCell>Date</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {user.payouts.map((p, idx) => (
                            <CTableRow key={p.id}>
                              <CTableDataCell className="small text-muted">
                                {idx + 1}
                              </CTableDataCell>
                              <CTableDataCell className="small fw-semibold">
                                {p.trip?.id ? (
                                  <span
                                    role="button"
                                    className="text-primary"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/trips/${p.trip.id}`)}
                                  >
                                    {p.trip.title || p.trip.id}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </CTableDataCell>
                              <CTableDataCell className="small text-muted">
                                {p.recipientRole?.replace(/_/g, ' ')}
                              </CTableDataCell>
                              <CTableDataCell className="small">{fmt(p.amount)}</CTableDataCell>
                              <CTableDataCell className="small fw-semibold">
                                {fmt(p.netAmount)}
                              </CTableDataCell>
                              <CTableDataCell className="small">
                                {p.dispatchMethod || '-'}
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color={PAYOUT_STATUS_COLOR[p.status] || 'secondary'}>
                                  {p.status}
                                </CBadge>
                              </CTableDataCell>
                              <CTableDataCell className="small text-muted">
                                {fmtDate(p.createdAt)}
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    </>
                  ) : (
                    <EmptyState message="No payouts found." />
                  )}
                </CTabPane>

                {/* Gallery */}
                <CTabPane visible={activeTab === 'gallery'}>
                  <AdminMediaGallery userId={id} cacheKey={`user-gallery-${id}`} />
                </CTabPane>
              </CTabContent>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Right — action panel */}
        <CCol xl={3}>
          <ActionPanel user={user} id={id} qc={qc} />
        </CCol>
      </CRow>

      {/* Add SP Destination Modal */}
      <CModal
        visible={spDestModal}
        onClose={() => {
          setSpDestModal(false)
          setSpDestError(null)
        }}
        size="lg"
      >
        <CModalHeader>
          <CModalTitle>Add Operating Destination</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {spDestError && (
            <CAlert color="danger" className="py-2 small mb-3">
              {spDestError}
            </CAlert>
          )}
          <div className="mb-3">
            <label className="form-label small fw-semibold">Search Destination</label>
            <CFormInput
              size="sm"
              placeholder="Type to search destinations."
              value={spDestSearch}
              onChange={(e) => {
                setSpDestSearch(e.target.value)
                setSpDestSelected('')
                setSpHotspotSelected('')
                setSpGatesSelected([])
              }}
            />
          </div>
          {destSearchData?.length > 0 && !spDestSelected && (
            <div className="border rounded mb-3" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {destSearchData.map((d) => (
                <div
                  key={d.id}
                  className="px-3 py-2 border-bottom small d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSpDestSelected(d.id)
                    setSpDestSearch(d.name)
                    setSpHotspotSelected('')
                    setSpGatesSelected([])
                  }}
                >
                  <span className="fw-semibold">{d.name}</span>
                  <span className="text-muted">
                    {d.country}
                    {d.region ? ` - ${d.region}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
          {spDestSelected && (
            <div className="mb-3">
              <div className="d-flex align-items-center gap-2 mb-2">
                <CBadge color="primary" className="py-1 px-2">
                  {spDestSearch}
                </CBadge>
                <CButton
                  size="sm"
                  color="outline-secondary"
                  onClick={() => {
                    setSpDestSelected('')
                    setSpDestSearch('')
                    setSpHotspotSelected('')
                    setSpGatesSelected([])
                  }}
                >
                  Change
                </CButton>
              </div>
              <label className="form-label small fw-semibold mt-2">
                Primary Hotspot <span className="text-muted fw-normal">(optional)</span>
              </label>
              {destHotspots.length === 0 ? (
                <div className="small text-muted">No hotspots defined for this destination.</div>
              ) : (
                <CFormSelect
                  size="sm"
                  value={spHotspotSelected}
                  onChange={(e) => setSpHotspotSelected(e.target.value)}
                >
                  <option value="">- No specific hotspot -</option>
                  {destHotspots.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.latitude?.toFixed(4)}, {h.longitude?.toFixed(4)})
                    </option>
                  ))}
                </CFormSelect>
              )}

              {destGates.length > 0 && (
                <>
                  <label className="form-label small fw-semibold mt-3">
                    Gates{' '}
                    <span className="text-muted fw-normal">
                      (optional — leave all unchecked to serve the whole destination)
                    </span>
                  </label>
                  <div className="border rounded p-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {destGates.map((g) => (
                      <CFormCheck
                        key={g.id}
                        id={`sp-gate-${g.id}`}
                        label={`${g.gateName}${g.zoneType ? ` (${g.zoneType})` : ''}`}
                        checked={spGatesSelected.includes(g.id)}
                        onChange={(e) =>
                          setSpGatesSelected((prev) =>
                            e.target.checked ? [...prev, g.id] : prev.filter((gid) => gid !== g.id),
                          )
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => {
              setSpDestModal(false)
              setSpDestError(null)
            }}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            disabled={!spDestSelected || addSPDestMut.isLoading}
            onClick={() =>
              addSPDestMut.mutate({
                destinationId: spDestSelected,
                primaryHotspotId: spHotspotSelected || undefined,
                destinationGatesID: spGatesSelected,
              })
            }
          >
            {addSPDestMut.isLoading ? <CSpinner size="sm" className="me-1" /> : null}
            Add Destination
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Edit gate-scoping for an already-linked destination */}
      <CModal visible={!!spEditGatesModal} onClose={() => setSpEditGatesModal(null)}>
        <CModalHeader>
          <CModalTitle>Edit Gates — {spEditGatesModal?.destination?.name}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {spEditGatesError && (
            <CAlert color="danger" dismissible onClose={() => setSpEditGatesError(null)}>
              {spEditGatesError}
            </CAlert>
          )}
          <p className="small text-muted">
            Leave all unchecked to have this SP serve the whole destination broadly.
          </p>
          {editDestGates.length === 0 ? (
            <div className="small text-muted">No gates defined for this destination.</div>
          ) : (
            <div className="border rounded p-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
              {editDestGates.map((g) => (
                <CFormCheck
                  key={g.id}
                  id={`sp-edit-gate-${g.id}`}
                  label={`${g.gateName}${g.zoneType ? ` (${g.zoneType})` : ''}`}
                  checked={spEditGatesSelected.includes(g.id)}
                  onChange={(e) =>
                    setSpEditGatesSelected((prev) =>
                      e.target.checked ? [...prev, g.id] : prev.filter((gid) => gid !== g.id),
                    )
                  }
                />
              ))}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => {
              setSpEditGatesModal(null)
              setSpEditGatesError(null)
            }}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            disabled={updateSPDestGatesMut.isLoading}
            onClick={() =>
              updateSPDestGatesMut.mutate({
                spdId: spEditGatesModal.id,
                destinationGatesID: spEditGatesSelected,
              })
            }
          >
            {updateSPDestGatesMut.isLoading ? <CSpinner size="sm" className="me-1" /> : null}
            Save
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

const EmptyState = ({ message }) => (
  <div className="text-center py-5 text-muted small">{message}</div>
)

export default UserDetail
