import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert,
  CFormInput, CFormSelect,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CFormTextarea,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilZoomIn, cilSettings, cilBookmark } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import { useSearchParamState } from '../../hooks/useSearchParamState'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'
import { formatRupees } from '../../lib/constants'

const TRIP_STATUS_COLOR = {
  DRAFT: 'secondary',
  ACTIVE: 'success',
  RUNNING: 'info',
  CANCELLED: 'danger',
  COMPLETED: 'dark',
  ARCHIVED: 'secondary',
}


const fetchTrips = async ({ limit, offset, search, status, featured, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  if (featured !== '') params.set('featured', featured)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/trips?${params}`)
  return res.data.data
}

const TripList = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [page, setPage] = useSearchParamState('page', 1, { type: 'number' })
  const [pageSize, setPageSize] = useSearchParamState('pageSize', 20, { type: 'number' })
  const [search, setSearch] = useSearchParamState('search', '')
  // Typing buffer only — not URL-synced itself, initializes from the
  // already-persisted `search` value so it's still correct on remount.
  const [searchInput, setSearchInput] = useState(search)
  const [statusFilter, setStatusFilter] = useSearchParamState('status', '')
  const [featuredFilter, setFeaturedFilter] = useSearchParamState('featured', '')
  const [sortBy, setSortBy] = useSearchParamState('sortBy', 'createdAt')
  const [sortOrder, setSortOrder] = useSearchParamState('sortOrder', 'desc')
  const [actionTrip, setActionTrip] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [mutError, setMutError] = useState(null)

  const offset = (page - 1) * pageSize

  const handleSort = (field, order) => { setSortBy(field); setSortOrder(order); setPage(1) }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-trips', { page, pageSize, search, statusFilter, featuredFilter, sortBy, sortOrder }],
    queryFn: () => fetchTrips({ limit: pageSize, offset, search, status: statusFilter, featured: featuredFilter, sortBy, sortOrder }),
    placeholderData: (prev) => prev,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...patch }) => api.patch(`/api/admin/trips/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-trips'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setActionTrip(null)
      setMutError(null)
    },
    onError: (err) => setMutError(err.response?.data?.message || 'Failed'),
  })

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleStatusUpdate = () => {
    if (!newStatus) { setMutError('Select a status'); return }
    updateMut.mutate({
      id: actionTrip.id,
      status: newStatus,
      cancellationReason: newStatus === 'CANCELLED' ? cancelReason : undefined,
    })
  }

  const toggleFeatured = (trip) => {
    updateMut.mutate({ id: trip.id, featured: !trip.featured })
  }

  return (
    <>
      <CCard>
        <CCardHeader>
          <strong>Trips</strong>

        </CCardHeader>
        <CCardBody>
          <CRow className="mb-3 g-2">
            <CCol md={4}>
              <form onSubmit={handleSearch} className="d-flex gap-2">
                <CFormInput size="sm" placeholder="Search title." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                <CButton type="submit" color="primary" size="sm">Go</CButton>
              </form>
            </CCol>
            <CCol md={3}>
              <CFormSelect size="sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
                <option value="">All statuses</option>
                {['DRAFT', 'ACTIVE', 'RUNNING', 'CANCELLED', 'COMPLETED', 'ARCHIVED'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <CFormSelect size="sm" value={featuredFilter} onChange={(e) => { setFeaturedFilter(e.target.value); setPage(1) }}>
                <option value="">Featured: all</option>
                <option value="true">Featured only</option>
                <option value="false">Not featured</option>
              </CFormSelect>
            </CCol>
          </CRow>

          {isLoading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
          {isError && <CAlert color="danger">Failed to load trips.</CAlert>}

          {data && (
            <>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                    <SortableHeader field="title" label="Title" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <CTableHeaderCell>Destination</CTableHeaderCell>
                    <SortableHeader field="status" label="Status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <CTableHeaderCell>Featured</CTableHeaderCell>
                    <SortableHeader field="priceMinor" label="Price" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <SortableHeader field="participants" label="Participants" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <CTableHeaderCell>Rating</CTableHeaderCell>
                    <SortableHeader field="createdAt" label="Created" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <CTableHeaderCell>Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {data.trips.map((t, idx) => (
                    <CTableRow key={t.id}>
                      <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                      <CTableDataCell>
                        <div className="small fw-semibold" style={{ cursor: 'pointer', color: 'var(--cui-link-color)' }} onClick={() => navigate(`/trips/${t.id}`)}>{t.title}</div>
                        <div className="small text-muted">{t.createdByUser?.name}</div>
                      </CTableDataCell>
                      <CTableDataCell className="small">{t.destination?.name}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={TRIP_STATUS_COLOR[t.status] || 'secondary'}>{t.status}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton
                          size="sm"
                          color={t.featured ? 'warning' : 'outline-secondary'}
                          onClick={() => toggleFeatured(t)}
                          title={t.featured ? 'Remove from featured' : 'Mark as featured'}
                        >
                          <CIcon icon={cilBookmark} size="sm" />
                        </CButton>
                      </CTableDataCell>
                      <CTableDataCell className="small">{formatRupees(t.priceMinor)}</CTableDataCell>
                      <CTableDataCell className="small">
                        {t.confirmedParticipantsCount ?? t._count?.participants ?? 0}
                      </CTableDataCell>
                      <CTableDataCell className="small">
                        {t.rating != null ? `★ ${t.rating.toFixed(1)} (${t.reviewCount ?? 0})` : '-'}
                      </CTableDataCell>
                      <CTableDataCell className="small text-muted">
                        {fmtDate(t.createdAt)}
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex gap-1">
                          <CButton size="sm" color="outline-primary" title="View" onClick={() => navigate(`/trips/${t.id}`)}>
                            <CIcon icon={cilZoomIn} size="sm" />
                          </CButton>
                          <CButton size="sm" color="outline-secondary" title="Update status" onClick={() => { setActionTrip(t); setNewStatus(t.status); setCancelReason(''); setMutError(null) }}>
                            <CIcon icon={cilSettings} size="sm" />
                          </CButton>
                        </div>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>

              <AdminTableFooter
                total={data.total}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
              />
            </>
          )}
        </CCardBody>
      </CCard>

      <CModal visible={!!actionTrip} onClose={() => { setActionTrip(null); setMutError(null) }}>
        <CModalHeader>
          <CModalTitle>Update Trip Status</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {mutError && <CAlert color="danger" className="mb-3">{mutError}</CAlert>}
          <p className="small text-muted mb-3">{actionTrip?.title}</p>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Status</label>
            <CFormSelect value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {['DRAFT', 'ACTIVE', 'RUNNING', 'CANCELLED', 'COMPLETED', 'ARCHIVED'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </CFormSelect>
          </div>
          {newStatus === 'CANCELLED' && (
            <div>
              <label className="form-label small fw-semibold">Cancellation Reason</label>
              <CFormTextarea rows={2} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setActionTrip(null)}>Cancel</CButton>
          <CButton color="primary" onClick={handleStatusUpdate} disabled={updateMut.isLoading}>
            {updateMut.isLoading ? <CSpinner size="sm" className="me-1" /> : null}
            Update
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default TripList
