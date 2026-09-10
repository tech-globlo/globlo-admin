import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchParamsState } from '../../hooks/useSearchParamState'
import { useQuery } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert, CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilZoomIn } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'
import { formatRupees as fmt } from '../../lib/constants'

const STATUS_COLOR = {
  PENDING: 'warning', PAID: 'success', PARTIALLY_REFUNDED: 'info',
  REFUNDED: 'secondary', CANCELLED: 'dark', FAILED: 'danger',
}

// BookingParticipant.status — separate from Payment.status above. A PG can
// cancel after paying without the payment itself being reversed (that only
// happens via a Refund), so these two statuses regularly disagree and both
// need to be visible side by side.
const BOOKING_STATUS_COLOR = {
  PENDING: 'warning', SUCCESS: 'success', CANCELLED: 'dark', FAILED: 'danger', REJECTED: 'secondary',
}

const fetchPayments = async ({ limit, offset, status, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (status) params.set('status', status)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/payments?${params}`)
  return res.data.data
}

const PaymentList = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useSearchParamsState({
    page: { default: 1, type: 'number' },
    pageSize: { default: 20, type: 'number' },
    statusFilter: { default: '' },
    sortBy: { default: 'createdAt' },
    sortOrder: { default: 'desc' },
  })
  const { page, pageSize, statusFilter, sortBy, sortOrder } = filters
  const offset = (page - 1) * pageSize

  const handleSort = (field, order) => { setFilters({ sortBy: field, sortOrder: order, page: 1 }) }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-payments', { page, pageSize, statusFilter, sortBy, sortOrder }],
    queryFn: () => fetchPayments({ limit: pageSize, offset, status: statusFilter, sortBy, sortOrder }),
    placeholderData: (prev) => prev,
  })

  return (
    <CCard>
      <CCardHeader>
        <strong>Payments</strong>

      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3">
          <CCol md={3}>
            <CFormSelect size="sm" value={statusFilter} onChange={(e) => setFilters({ statusFilter: e.target.value, page: 1 })}>
              <option value="">All statuses</option>
              {['PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CANCELLED', 'FAILED'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>

        {isLoading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
        {isError && <CAlert color="danger">Failed to load payments.</CAlert>}

        {data && (
          <>
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <CTableHeaderCell>From</CTableHeaderCell>
                  <CTableHeaderCell>Trip</CTableHeaderCell>
                  <SortableHeader field="totalAmountMinor" label="Amount" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>Fee</CTableHeaderCell>
                  <CTableHeaderCell>Method</CTableHeaderCell>
                  <SortableHeader field="status" label="Status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>Booking Status</CTableHeaderCell>
                  <CTableHeaderCell>Refunds</CTableHeaderCell>
                  <SortableHeader field="createdAt" label="Date" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.payments.map((p, idx) => (
                  <CTableRow key={p.id}>
                    <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                    <CTableDataCell>
                      <div className="small fw-semibold">{p.fromUser?.name}</div>
                      <div className="small text-muted">{p.fromUser?.email}</div>
                    </CTableDataCell>
                    <CTableDataCell className="small">{p.trip?.title}</CTableDataCell>
                    <CTableDataCell className="small fw-semibold">{fmt(p.totalAmountMinor)}</CTableDataCell>
                    <CTableDataCell className="small text-muted">{fmt(p.platformFeeMinor)}</CTableDataCell>
                    <CTableDataCell className="small">{p.paymentMethod || '-'}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={STATUS_COLOR[p.status] || 'secondary'}>{p.status}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      {p.participant?.status ? (
                        <CBadge color={BOOKING_STATUS_COLOR[p.participant.status] || 'secondary'}>
                          {p.participant.status}
                        </CBadge>
                      ) : (
                        <span className="text-muted small">-</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="small">{p.refunds?.length || 0}</CTableDataCell>
                    <CTableDataCell className="small text-muted">
                      {fmtDate(p.createdAt)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton size="sm" color="outline-primary" onClick={() => navigate(`/payments/${p.id}`)}>
                        <CIcon icon={cilZoomIn} size="sm" />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>

            <AdminTableFooter
              total={data.total}
              page={page}
              pageSize={pageSize}
              onPageChange={(p) => setFilters({ page: p })}
              onPageSizeChange={(s) => setFilters({ pageSize: s, page: 1 })}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default PaymentList
