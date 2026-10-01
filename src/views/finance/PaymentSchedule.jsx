import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
  CFormInput,
  CFormSelect,
} from '@coreui/react'
import api from '../../lib/api'
import { formatRupees } from '../../lib/constants'
import AdminTableFooter from '../../components/AdminTableFooter'
import { ParticipantMilestoneTable } from '../../components/ParticipantMilestoneTable'

const MILESTONE_STATUSES = ['PENDING', 'DUE', 'PAID', 'CANCELLED']

const fetchSchedules = async ({ limit, offset, search, milestoneStatus }) => {
  const params = new URLSearchParams({ limit, offset })
  if (search) params.set('search', search)
  if (milestoneStatus) params.set('milestoneStatus', milestoneStatus)
  const res = await api.get(`/api/admin/participant-schedule?${params}`)
  return res.data.data
}

// Sibling of PayoutSchedule.jsx — same shape, other side of the ledger (a
// PG paying a TM in installments, instead of a TM paying an SP). This is
// the cross-trip view; the per-participant modal in TripDetail.jsx covers
// "I'm already looking at this trip", this covers "what's due right now
// across the whole platform".
const PaymentSchedule = () => {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [msFilter, setMsFilter] = useState('')

  const offset = (page - 1) * pageSize

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-participant-schedule', { page, pageSize, search, msFilter }],
    queryFn: () => fetchSchedules({ limit: pageSize, offset, search, milestoneStatus: msFilter }),
    placeholderData: (prev) => prev,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <CCard>
      <CCardHeader>
        <strong>Payment Schedule</strong>
        {data && <span className="ms-2 text-muted small">({data.total} schedules)</span>}
      </CCardHeader>
      <CCardBody>
        {/* Filters */}
        <CRow className="mb-3 g-2 align-items-end">
          <CCol md={7}>
            <form onSubmit={handleSearch} className="d-flex gap-2">
              <CFormInput
                size="sm"
                placeholder="Search trip title or participant name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <CButton type="submit" color="primary" size="sm">Search</CButton>
              {search && (
                <CButton size="sm" color="secondary" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}>
                  Clear
                </CButton>
              )}
            </form>
          </CCol>
          <CCol md={3}>
            <CFormSelect
              size="sm"
              value={msFilter}
              onChange={(e) => { setMsFilter(e.target.value); setPage(1) }}
            >
              <option value="">All milestone statuses</option>
              {MILESTONE_STATUSES.map((s) => (
                <option key={s} value={s}>Has {s.charAt(0) + s.slice(1).toLowerCase()}</option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>

        {isLoading && (
          <div className="text-center py-4"><CSpinner color="primary" /></div>
        )}
        {isError && <CAlert color="danger">Failed to load payment schedules.</CAlert>}
        {data && data.schedules.length === 0 && (
          <p className="text-muted small">No payment schedules found.</p>
        )}

        {data && data.schedules.map((schedule) => (
          <CCard key={schedule.id} className="mb-3 border">
            <CCardHeader className="d-flex justify-content-between align-items-center py-2">
              <div>
                <span
                  className="small fw-semibold text-primary"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/trips/${schedule.tripId}`)}
                >
                  {schedule.trip ? schedule.trip.title : schedule.tripId.slice(0, 8)}
                </span>
                <CBadge
                  color="light"
                  textColor="dark"
                  className="ms-2 small"
                  style={{ cursor: schedule.participant?.user?.id ? 'pointer' : undefined }}
                  onClick={() =>
                    schedule.participant?.user?.id && navigate(`/users/${schedule.participant.user.id}`)
                  }
                >
                  {schedule.participant?.user?.name || 'Unknown participant'}
                </CBadge>
              </div>
              <div className="d-flex align-items-center gap-3">
                <span className="small text-muted fw-semibold">
                  Total: {formatRupees(schedule.totalAmountMinor)}
                </span>
                <span className="small text-muted">ID: {schedule.id.slice(0, 8)}</span>
              </div>
            </CCardHeader>
            <CCardBody className="p-0">
              <ParticipantMilestoneTable
                milestones={schedule.milestones}
                onViewPayment={(paymentId) => navigate(`/payments/${paymentId}`)}
              />
            </CCardBody>
          </CCard>
        ))}

        {data && (
          <AdminTableFooter
            total={data.total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          />
        )}
      </CCardBody>
    </CCard>
  )
}

export default PaymentSchedule
