import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CBadge, CButton, CSpinner, CAlert,
  CListGroup, CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const fmt = (paise) => {
  if (paise == null) return '-'
  return '₹' + (Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

const REFUND_STATUS_COLOR = {
  REQUESTED: 'warning', PROCESSING: 'info', ISSUED: 'success',
  FAILED: 'danger', CANCELLED: 'secondary',
}
const PAYMENT_STATUS_COLOR = {
  PENDING: 'warning', PAID: 'success', PARTIALLY_REFUNDED: 'info',
  REFUNDED: 'secondary', CANCELLED: 'dark', FAILED: 'danger',
}

const InfoRow = ({ label, value, mono }) => (
  <CListGroupItem className="d-flex justify-content-between align-items-start py-2 px-0 border-start-0 border-end-0">
    <span className="text-muted small" style={{ minWidth: 180 }}>{label}</span>
    <span className={`small fw-semibold text-end ${mono ? 'font-monospace' : ''}`} style={{ maxWidth: '55%', wordBreak: 'break-all' }}>
      {value ?? '-'}
    </span>
  </CListGroupItem>
)

const Section = ({ title, children }) => (
  <div className="mb-4">
    <div className="small fw-bold text-uppercase text-muted mb-2" style={{ letterSpacing: 1 }}>{title}</div>
    {children}
  </div>
)

const RefundDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: refund, isLoading, isError } = useQuery({
    queryKey: ['admin-refund', id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/refunds/${id}`)
      return res.data.data
    },
  })

  if (isLoading) return <div className="text-center py-5"><CSpinner color="primary" /></div>
  if (isError || !refund) return <CAlert color="danger">Failed to load refund.</CAlert>

  const pctDisplay = refund.refundPct != null ? `${(refund.refundPct * 100).toFixed(0)}%` : '-'

  return (
    <CCard>
      <CCardHeader>
        <CButton color="link" className="p-0 mb-2 text-muted small d-block" onClick={() => navigate(-1)}>
          <CIcon icon={cilArrowLeft} className="me-1" size="sm" />Back
        </CButton>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div>
            <div className="fw-semibold">Refund Detail</div>
            <div className="small text-muted font-monospace">{refund.id}</div>
          </div>
          <CBadge color={REFUND_STATUS_COLOR[refund.status] || 'secondary'} style={{ fontSize: 13 }}>
            {refund.status}
          </CBadge>
        </div>
      </CCardHeader>

      <CCardBody>
        <CRow className="g-4">

          {/* ── Left ── */}
          <CCol md={6}>

            <Section title="Refund Details">
              <div className="border rounded overflow-hidden mb-3">
                <div className="d-flex justify-content-between px-3 py-2 fw-bold" style={{ background: 'var(--cui-tertiary-bg)' }}>
                  <span>Refund Amount</span>
                  <span>{fmt(refund.amountMinor)}</span>
                </div>
                <div className="d-flex justify-content-between px-3 py-2 small" style={{ borderTop: '1px solid var(--cui-border-color)' }}>
                  <span className="text-muted">Currency</span>
                  <span className="fw-semibold">{refund.currency}</span>
                </div>
                {refund.refundPct != null && (
                  <div className="d-flex justify-content-between px-3 py-2 small" style={{ borderTop: '1px solid var(--cui-border-color)' }}>
                    <span className="text-muted">Refund Policy %</span>
                    <span className="fw-semibold">{pctDisplay}</span>
                  </div>
                )}
              </div>
              <CListGroup flush>
                <InfoRow label="Reason"       value={refund.reason?.replace(/_/g, ' ')} />
                <InfoRow label="Initiated By" value={refund.initiatedBy} />
                {refund.initiatedByUserId && (
                  <InfoRow
                    label="Initiated By (Admin)"
                    value={
                      <span
                        role="button"
                        className="text-primary"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/users/${refund.initiatedByUserId}`)}
                      >
                        {refund.initiatedByUserId}
                      </span>
                    }
                    mono
                  />
                )}
                <InfoRow label="Journal ID"   value={refund.journalId} mono />
                <InfoRow label="Gateway Refund ID" value={refund.externalRefundId} mono />
                <InfoRow label="Refund Policy ID"  value={refund.refundPolicyId} mono />
                {refund.failureReason && (
                  <InfoRow label="Failure Reason" value={refund.failureReason} />
                )}
              </CListGroup>
            </Section>

            <Section title="Timeline">
              <CListGroup flush>
                <InfoRow label="Created"   value={fmtDateTime(refund.createdAt)} />
                <InfoRow label="Initiated" value={fmtDateTime(refund.initiatedAt)} />
                <InfoRow label="Completed" value={fmtDateTime(refund.completedAt)} />
                <InfoRow label="Updated"   value={fmtDateTime(refund.updatedAt)} />
              </CListGroup>
            </Section>

          </CCol>

          {/* ── Right ── */}
          <CCol md={6}>

            <Section title="Payer (Original)">
              <CListGroup flush>
                <InfoRow label="Name"  value={refund.payment?.fromUser?.name} />
                <InfoRow label="Email" value={refund.payment?.fromUser?.email} />
                <InfoRow label="Phone" value={refund.payment?.fromUser?.phone} />
              </CListGroup>
            </Section>

            <Section title="Recipient (Trip Manager)">
              <CListGroup flush>
                <InfoRow label="Name"  value={refund.payment?.toUser?.name} />
                <InfoRow label="Email" value={refund.payment?.toUser?.email} />
              </CListGroup>
            </Section>

            <Section title="Trip">
              <CListGroup flush>
                <InfoRow label="Trip Title"  value={refund.payment?.trip?.title} />
                <InfoRow label="Destination" value={refund.payment?.trip?.destination?.name} />
                <InfoRow label="Trip ID"     value={refund.payment?.trip?.id} mono />
              </CListGroup>
            </Section>

            <Section title="Original Payment">
              <CListGroup flush>
                <InfoRow label="Payment ID"    value={refund.payment?.id} mono />
                <InfoRow label="Amount Paid"   value={fmt(refund.payment?.totalAmountMinor)} />
                <InfoRow label="Payment Status" value={
                  refund.payment?.status
                    ? <CBadge color={PAYMENT_STATUS_COLOR[refund.payment.status] || 'secondary'}>{refund.payment.status}</CBadge>
                    : '-'
                } />
              </CListGroup>
              <div className="mt-2">
                <CButton
                  size="sm"
                  color="outline-primary"
                  onClick={() => navigate(`/payments/${refund.payment?.id}`)}
                  disabled={!refund.payment?.id}
                >
                  View Full Payment -
                </CButton>
              </div>
            </Section>

          </CCol>
        </CRow>

        {/* External context */}
        {refund.externalContext && (
          <Section title="External Context">
            <pre className="small p-3 rounded" style={{ background: 'var(--cui-tertiary-bg)', overflowX: 'auto', fontSize: 11 }}>
              {JSON.stringify(refund.externalContext, null, 2)}
            </pre>
          </Section>
        )}

      </CCardBody>
    </CCard>
  )
}

export default RefundDetail
