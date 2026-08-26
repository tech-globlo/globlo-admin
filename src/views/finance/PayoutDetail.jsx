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
  CListGroup,
  CListGroupItem,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormSelect,
  CFormTextarea,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil, cilExternalLink } from '@coreui/icons'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'
import { formatRupees } from '../../lib/constants'

const fmt = (paise) => (paise == null ? '-' : formatRupees(paise))

const STATUS_COLOR = {
  SCHEDULED: 'secondary',
  READY: 'primary',
  PROCESSING: 'info',
  SUCCESS: 'success',
  FAILED: 'danger',
  ON_HOLD: 'warning',
  CANCELLED: 'dark',
}

const InfoRow = ({ label, value, mono, linkTo, onNavigate }) => (
  <CListGroupItem className="d-flex justify-content-between align-items-start py-2 px-0 border-start-0 border-end-0">
    <span className="text-muted small" style={{ minWidth: 160 }}>
      {label}
    </span>
    <span
      className={`small fw-semibold text-end ${mono ? 'font-monospace' : ''}`}
      style={{ maxWidth: '60%', wordBreak: 'break-all' }}
    >
      {linkTo && value ? (
        <span
          role="button"
          className="text-primary"
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => onNavigate(linkTo)}
        >
          {value}
          <CIcon icon={cilExternalLink} size="sm" className="ms-1" />
        </span>
      ) : (
        (value ?? '-')
      )}
    </span>
  </CListGroupItem>
)

const Section = ({ title, children }) => (
  <div className="mb-4">
    <div className="small fw-bold text-uppercase text-muted mb-2" style={{ letterSpacing: 1 }}>
      {title}
    </div>
    {children}
  </div>
)

const PayoutDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editModal, setEditModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [holdReason, setHoldReason] = useState('')
  const [mutError, setMutError] = useState(null)
  const [confirmVerifyMethod, setConfirmVerifyMethod] = useState(null) // payoutMethod being verified, or null

  const {
    data: p,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-payout', id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/payouts/${id}`)
      return res.data.data
    },
  })

  const updateMut = useMutation({
    mutationFn: (payload) => api.patch(`/api/admin/payouts/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payout', id] })
      qc.invalidateQueries({ queryKey: ['admin-payouts'] })
      setEditModal(false)
      setMutError(null)
    },
    onError: (err) => setMutError(err.response?.data?.message || 'Failed to update'),
  })

  // Verification is manual/DB-level for now — a future phase will check
  // status against the gateway's bank API instead of an admin eyeballing
  // the submitted account details.
  const verifyMethodMut = useMutation({
    mutationFn: (methodId) => api.post(`/api/admin/payout-methods/${methodId}/verify`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payout', id] })
      setConfirmVerifyMethod(null)
    },
  })

  const handleUpdate = () => {
    if (!newStatus) {
      setMutError('Select a status')
      return
    }
    if (newStatus === 'ON_HOLD' && !holdReason.trim()) {
      setMutError('Hold reason is required')
      return
    }
    updateMut.mutate({ status: newStatus, holdReason })
  }

  const openEdit = () => {
    setNewStatus(p.status)
    setHoldReason('')
    setMutError(null)
    setEditModal(true)
  }

  if (isLoading)
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  if (isError) return <CAlert color="danger">Failed to load payout.</CAlert>
  if (!p) return null

  const canEdit = ['SCHEDULED', 'READY', 'ON_HOLD', 'FAILED'].includes(p.status)

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-3">
        <CButton color="secondary" size="sm" onClick={() => navigate(-1)}>
          <CIcon icon={cilArrowLeft} size="sm" className="me-1" />
          Back
        </CButton>
        <h5 className="mb-0 flex-grow-1">Payout Detail</h5>
        {canEdit && (
          <CButton color="primary" size="sm" onClick={openEdit}>
            <CIcon icon={cilPencil} size="sm" className="me-1" />
            Update Status
          </CButton>
        )}
      </div>

      <CRow className="g-3">
        {/* Left column */}
        <CCol md={5}>
          <CCard className="mb-3">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Payout Info</strong>
              <CBadge color={STATUS_COLOR[p.status] || 'secondary'}>{p.status}</CBadge>
            </CCardHeader>
            <CCardBody>
              <Section title="Amount Breakdown">
                <CListGroup flush>
                  <InfoRow label="Gross Amount" value={fmt(p.amount)} />
                  <InfoRow label="Platform Fee" value={fmt(p.platformFee)} />
                  <InfoRow label="Net Amount" value={fmt(p.netAmount)} />
                  <InfoRow label="Currency" value={p.currency} />
                </CListGroup>
              </Section>

              <Section title="Details">
                <CListGroup flush>
                  <InfoRow label="Recipient Role" value={p.recipientRole?.replace(/_/g, ' ')} />
                  <InfoRow label="Dispatch Method" value={p.dispatchMethod} />
                  <InfoRow label="Mode" value={p.mode} />
                </CListGroup>
              </Section>

              <Section title="Timestamps">
                <CListGroup flush>
                  <InfoRow label="Created" value={fmtDateTime(p.createdAt)} />
                  <InfoRow label="Initiated" value={fmtDateTime(p.initiatedAt)} />
                  <InfoRow label="Completed" value={fmtDateTime(p.completedAt)} />
                  <InfoRow label="Updated" value={fmtDateTime(p.updatedAt)} />
                </CListGroup>
              </Section>

              {p.failureReason && (
                <CAlert color="danger" className="small mt-2">
                  <strong>Failure Reason:</strong> {p.failureReason}
                </CAlert>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* Right column */}
        <CCol md={7}>
          <CCard className="mb-3">
            <CCardHeader>
              <strong>Recipient</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <InfoRow
                  label="Name"
                  value={p.recipient?.name}
                  linkTo={p.recipient?.id ? `/users/${p.recipient.id}` : null}
                  onNavigate={navigate}
                />
                <InfoRow label="Email" value={p.recipient?.email} />
                <InfoRow label="Phone" value={p.recipient?.phone} />
              </CListGroup>
            </CCardBody>
          </CCard>

          <CCard className="mb-3">
            <CCardHeader>
              <strong>Payout Method</strong>
            </CCardHeader>
            <CCardBody>
              {p.recipient?.payoutMethods?.length > 0 ? (
                p.recipient.payoutMethods.map((m) => (
                  <div
                    key={m.id}
                    className="d-flex justify-content-between align-items-start mb-3 pb-3 border-bottom"
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="small fw-semibold">
                          {m.label || (m.type === 'BANK' ? 'Bank Account' : 'UPI')}
                        </span>
                        {m.primary && <CBadge color="dark">Primary</CBadge>}
                        <CBadge color={m.verified ? 'success' : 'warning'}>
                          {m.verified ? 'Verified' : 'Unverified'}
                        </CBadge>
                      </div>
                      <div className="small text-muted">
                        {m.type === 'BANK'
                          ? `${m.accountHolderName || ''} · ${m.accountNumberMasked || ''} · ${m.ifscCode || ''}`
                          : m.upiId}
                      </div>
                    </div>
                    {!m.verified && (
                      <CButton color="success" size="sm" onClick={() => setConfirmVerifyMethod(m)}>
                        Verify
                      </CButton>
                    )}
                  </div>
                ))
              ) : (
                <div className="small text-muted">No payout method on file for this recipient.</div>
              )}
            </CCardBody>
          </CCard>

          <CCard className="mb-3">
            <CCardHeader>
              <strong>Trip</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <InfoRow
                  label="Title"
                  value={p.trip?.title}
                  linkTo={p.trip?.id ? `/trips/${p.trip.id}` : null}
                  onNavigate={navigate}
                />
                <InfoRow label="Trip ID" value={p.trip?.id} mono />
              </CListGroup>
            </CCardBody>
          </CCard>

          {p.payment && (
            <CCard className="mb-3">
              <CCardHeader>
                <strong>Linked Payment</strong>
              </CCardHeader>
              <CCardBody>
                <CListGroup flush>
                  <InfoRow
                    label="Payment"
                    value={`${fmt(p.payment.totalAmountMinor)} — ${p.payment.status}`}
                    linkTo={`/payments/${p.payment.id}`}
                    onNavigate={navigate}
                  />
                  <InfoRow label="Payment ID" value={p.payment.id} mono />
                </CListGroup>
              </CCardBody>
            </CCard>
          )}

          <CCard>
            <CCardHeader>
              <strong>Gateway References</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <InfoRow label="Razorpay Payout ID" value={p.razorpayPayoutId} mono />
                <InfoRow label="Razorpay Transfer ID" value={p.razorpayTransferId} mono />
                <InfoRow label="Razorpay Account ID" value={p.razorpayAccountId} mono />
                <InfoRow label="Payout ID" value={p.id} mono />
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Edit Status Modal */}
      <CModal visible={editModal} onClose={() => setEditModal(false)}>
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
            {p.recipient?.name} - {p.trip?.title}
          </p>
          <p className="small fw-semibold mb-3">{fmt(p.netAmount)}</p>
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
          <CButton color="secondary" onClick={() => setEditModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleUpdate} disabled={updateMut.isLoading}>
            {updateMut.isLoading ? <CSpinner size="sm" className="me-1" /> : null}
            Update
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Verify Payout Method */}
      <CModal visible={!!confirmVerifyMethod} onClose={() => setConfirmVerifyMethod(null)}>
        <CModalHeader>
          <CModalTitle>Verify Payout Method</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="small text-muted">
            Confirm the account details below match what {p.recipient?.name || 'the recipient'}{' '}
            submitted, then mark this payout method as verified.
          </p>
          {confirmVerifyMethod && (
            <div className="small fw-semibold">
              {confirmVerifyMethod.type === 'BANK'
                ? `${confirmVerifyMethod.accountHolderName || ''} · ${confirmVerifyMethod.accountNumberMasked || ''} · ${confirmVerifyMethod.ifscCode || ''}`
                : confirmVerifyMethod.upiId}
            </div>
          )}
          {verifyMethodMut.isError && (
            <CAlert color="danger" className="small mt-3 mb-0">
              {verifyMethodMut.error?.response?.data?.message || 'Failed to verify payout method.'}
            </CAlert>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setConfirmVerifyMethod(null)}>
            Cancel
          </CButton>
          <CButton
            color="success"
            disabled={verifyMethodMut.isLoading}
            onClick={() => verifyMethodMut.mutate(confirmVerifyMethod.id)}
          >
            {verifyMethodMut.isLoading ? <CSpinner size="sm" /> : 'Confirm Verify'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default PayoutDetail
