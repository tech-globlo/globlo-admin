import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CBadge,
  CButton,
  CSpinner,
  CAlert,
  CFormSelect,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormTextarea,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilZoomIn } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'
import { formatRupees as formatRupees_ } from '../../lib/constants'

const STATUS_COLOR = {
  SCHEDULED: 'secondary',
  READY: 'primary',
  PROCESSING: 'info',
  SUCCESS: 'success',
  FAILED: 'danger',
  ON_HOLD: 'warning',
  CANCELLED: 'dark',
}

const formatRupees = formatRupees_

const fetchPayouts = async ({ limit, offset, status, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (status) params.set('status', status)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/payouts?${params}`)
  return res.data.data
}

const PayoutList = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [actionPayout, setActionPayout] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [holdReason, setHoldReason] = useState('')
  const [mutError, setMutError] = useState(null)

  const offset = (page - 1) * pageSize

  const handleSort = (field, order) => {
    setSortBy(field)
    setSortOrder(order)
    setPage(1)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-payouts', { page, pageSize, statusFilter, sortBy, sortOrder }],
    queryFn: () =>
      fetchPayouts({ limit: pageSize, offset, status: statusFilter, sortBy, sortOrder }),
    placeholderData: (prev) => prev,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, status, holdReason }) =>
      api.patch(`/api/admin/payouts/${id}`, { status, holdReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payouts'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setActionPayout(null)
      setMutError(null)
    },
    onError: (err) => setMutError(err.response?.data?.message || 'Failed'),
  })

  const handleSubmit = () => {
    if (!newStatus) {
      setMutError('Select a status')
      return
    }
    if (newStatus === 'ON_HOLD' && !holdReason.trim()) {
      setMutError('Hold reason is required')
      return
    }
    updateMut.mutate({ id: actionPayout.id, status: newStatus, holdReason })
  }

  return (
    <>
      <CCard>
        <CCardHeader>
          <strong>Payouts</strong>

        </CCardHeader>
        <CCardBody>
          <CRow className="mb-3">
            <CCol md={3}>
              <CFormSelect
                size="sm"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All statuses</option>
                {[
                  'SCHEDULED',
                  'READY',
                  'PROCESSING',
                  'SUCCESS',
                  'FAILED',
                  'ON_HOLD',
                  'CANCELLED',
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>

          {isLoading && (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          )}
          {isError && <CAlert color="danger">Failed to load payouts.</CAlert>}

          {data && (
            <>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                    <CTableHeaderCell>Recipient</CTableHeaderCell>
                    <CTableHeaderCell>Trip</CTableHeaderCell>
                    <SortableHeader
                      field="recipientRole"
                      label="Role"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="amount"
                      label="Amount"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="netAmount"
                      label="Net"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="status"
                      label="Status"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="createdAt"
                      label="Date"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <CTableHeaderCell>Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {data.payouts.map((p, idx) => (
                    <CTableRow key={p.id}>
                      <CTableDataCell className="small text-muted">
                        {offset + idx + 1}
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="small fw-semibold">{p.recipient?.name}</div>
                        <div className="small text-muted">{p.recipient?.email}</div>
                      </CTableDataCell>
                      <CTableDataCell className="small">{p.trip?.title}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="light" textColor="dark">
                          {p.recipientRole}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small">{formatRupees(p.amount)}</CTableDataCell>
                      <CTableDataCell className="small fw-semibold">
                        {formatRupees(p.netAmount)}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={STATUS_COLOR[p.status] || 'secondary'}>{p.status}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small text-muted">
                        {fmtDate(p.createdAt)}
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex gap-1">
                          <CButton
                            size="sm"
                            color="outline-secondary"
                            title="View detail"
                            onClick={() => navigate(`/payouts/${p.id}`)}
                          >
                            <CIcon icon={cilZoomIn} size="sm" />
                          </CButton>
                          {['SCHEDULED', 'READY', 'ON_HOLD', 'FAILED'].includes(p.status) && (
                            <CButton
                              size="sm"
                              color="outline-primary"
                              title="Edit status"
                              onClick={() => {
                                setActionPayout(p)
                                setNewStatus(p.status)
                                setHoldReason('')
                                setMutError(null)
                              }}
                            >
                              <CIcon icon={cilPencil} size="sm" />
                            </CButton>
                          )}
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
                onPageSizeChange={(s) => {
                  setPageSize(s)
                  setPage(1)
                }}
              />
            </>
          )}
        </CCardBody>
      </CCard>

      <CModal
        visible={!!actionPayout}
        onClose={() => {
          setActionPayout(null)
          setMutError(null)
        }}
      >
        <CModalHeader>
          <CModalTitle>Update Payout Status</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {mutError && (
            <CAlert color="danger" className="mb-3">
              {mutError}
            </CAlert>
          )}
          <p className="small text-muted mb-1">
            {actionPayout?.recipient?.name} - {actionPayout?.trip?.title}
          </p>
          <p className="small fw-semibold mb-3">{formatRupees(actionPayout?.netAmount)}</p>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Status</label>
            <CFormSelect value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="READY">READY (release)</option>
              <option value="ON_HOLD">ON_HOLD</option>
              <option value="CANCELLED">CANCELLED</option>
            </CFormSelect>
          </div>
          {newStatus === 'ON_HOLD' && (
            <div>
              <label className="form-label small fw-semibold">Hold Reason *</label>
              <CFormTextarea
                rows={2}
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
              />
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setActionPayout(null)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSubmit} disabled={updateMut.isPending}>
            {updateMut.isPending ? <CSpinner size="sm" className="me-1" /> : null}
            Update
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default PayoutList
