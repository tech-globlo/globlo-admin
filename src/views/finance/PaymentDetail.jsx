import React, { useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CBadge, CButton, CSpinner, CAlert,
  CListGroup, CListGroupItem,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCloudDownload, cilShareAlt, cilExternalLink } from '@coreui/icons'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'
import { formatRupees } from '../../lib/constants'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (paise) => paise == null ? '-' : formatRupees(paise)

const STATUS_COLOR = {
  PENDING: 'warning', PAID: 'success', PARTIALLY_REFUNDED: 'info',
  REFUNDED: 'secondary', CANCELLED: 'dark', FAILED: 'danger',
}
const REFUND_STATUS_COLOR = {
  REQUESTED: 'warning', PROCESSING: 'info', ISSUED: 'success',
  FAILED: 'danger', CANCELLED: 'secondary',
}
const PAYOUT_STATUS_COLOR = {
  SCHEDULED: 'warning', PROCESSING: 'info', PAID: 'success',
  FAILED: 'danger', CANCELLED: 'secondary', HELD: 'dark',
}

const InfoRow = ({ label, value, mono, linkTo, onNavigate }) => (
  <CListGroupItem className="d-flex justify-content-between align-items-start py-2 px-0 border-start-0 border-end-0">
    <span className="text-muted small" style={{ minWidth: 180 }}>{label}</span>
    <span className={`small fw-semibold text-end ${mono ? 'font-monospace' : ''}`} style={{ maxWidth: '55%', wordBreak: 'break-all' }}>
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
      ) : (value ?? '-')}
    </span>
  </CListGroupItem>
)

const Section = ({ title, children }) => (
  <div className="mb-4">
    <div className="small fw-bold text-uppercase text-muted mb-2" style={{ letterSpacing: 1 }}>{title}</div>
    {children}
  </div>
)

// ── Legacy local print (unused — kept for reference) ─────────────────────────
const _printInvoice = (payment) => {
  const discountAmt = Number(payment.discountAmountMinor || 0)
  const rows = [
    ['Base Amount', fmt(payment.amountMinor)],
    ['Platform Fee', fmt(payment.platformFeeMinor)],
    ['Gateway Fee', fmt(payment.gatewayFeeMinor)],
    ['GST on Gateway', fmt(payment.gatewayTaxMinor)],
    ...(discountAmt > 0 ? [['Discount Applied', '-' + fmt(payment.discountAmountMinor)]] : []),
  ]

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice - ${payment.id}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; color: #333; padding: 40px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #e2f7ea; color: #1a7a3c; }
    .meta { color: #888; font-size: 11px; margin-bottom: 32px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 7px 10px; border: 1px solid #e0e0e0; font-size: 12px; }
    th { background: #f5f5f5; font-weight: 600; text-align: left; }
    .total-row td { font-weight: 700; background: #f0f0f0; }
    .right { text-align: right; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Payment Invoice</h1>
  <div class="meta">ID: ${payment.id} &nbsp;|&nbsp; ${fmtDateTime(payment.createdAt)}</div>

  <div style="display:flex; gap:40px; margin-bottom:24px;">
    <div class="section" style="flex:1">
      <div class="section-title">Payer</div>
      <div><strong>${payment.fromUser?.name || '-'}</strong></div>
      <div>${payment.fromUser?.email || ''}</div>
      <div>${payment.fromUser?.phone || ''}</div>
    </div>
    <div class="section" style="flex:1">
      <div class="section-title">Recipient</div>
      <div><strong>${payment.toUser?.name || '-'}</strong></div>
      <div>${payment.toUser?.email || ''}</div>
    </div>
    <div class="section" style="flex:1">
      <div class="section-title">Trip</div>
      <div><strong>${payment.trip?.title || '-'}</strong></div>
      <div>${payment.trip?.destination?.name || ''}</div>
      <div>${payment.trip?.startDate ? fmtDate(payment.trip.startDate) + ' to ' + fmtDate(payment.trip.endDate) : ''}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Amount Breakdown</div>
    <table>
      <tbody>
        ${rows.map(([l, v]) => `<tr><td>${l}</td><td class="right">${v}</td></tr>`).join('')}
        <tr class="total-row"><td>Total Charged</td><td class="right">${fmt(payment.totalAmountMinor)}</td></tr>
        ${Number(payment.refundedAmountMinor || 0) > 0 ? `<tr><td>Total Refunded</td><td class="right">${fmt(payment.refundedAmountMinor)}</td></tr>` : ''}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Transaction References</div>
    <table>
      <tbody>
        <tr><td>Payment Method</td><td>${payment.paymentMethod || '-'}</td></tr>
        <tr><td>Razorpay Order ID</td><td>${payment.razorpayOrderId || '-'}</td></tr>
        <tr><td>Razorpay Payment ID</td><td>${payment.razorpayPaymentId || '-'}</td></tr>
        ${payment.upiTransactionId ? `<tr><td>UPI Transaction ID</td><td>${payment.upiTransactionId}</td></tr>` : ''}
        ${payment.bankReferenceNumber ? `<tr><td>Bank Reference (RRN)</td><td>${payment.bankReferenceNumber}</td></tr>` : ''}
      </tbody>
    </table>
  </div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=800,height=900')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 400)
}

// ── Component ─────────────────────────────────────────────────────────────────
const PaymentDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [copied, setCopied] = React.useState(false)
  const [downloading, setDownloading] = React.useState(false)

  const { data: payment, isLoading, isError } = useQuery({
    queryKey: ['admin-payment', id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/payments/${id}`)
      return res.data.data
    },
  })

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownloadInvoice = async () => {
    setDownloading(true)
    try {
      const res = await api.get(`/api/admin/payments/${id}/invoice`)
      window.open(res.data.data.url, '_blank')
    } catch {
      alert('Failed to generate invoice. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) return <div className="text-center py-5"><CSpinner color="primary" /></div>
  if (isError || !payment) return <CAlert color="danger">Failed to load payment.</CAlert>

  const discountAmt = Number(payment.discountAmountMinor || 0)
  const refunded    = Number(payment.refundedAmountMinor || 0)

  return (
    <CCard>
      <CCardHeader>
        <CButton color="link" className="p-0 mb-2 text-muted small d-block" onClick={() => navigate(-1)}>
          <CIcon icon={cilArrowLeft} className="me-1" size="sm" />Back
        </CButton>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div>
              <div className="fw-semibold">Payment Detail</div>
              <div className="small text-muted font-monospace">{payment.id}</div>
            </div>
            <CBadge color={STATUS_COLOR[payment.status] || 'secondary'} style={{ fontSize: 13 }}>
              {payment.status}
            </CBadge>
            {payment.externalPaymentConfirmed && (
              <CBadge color="success">Gateway Confirmed</CBadge>
            )}
          </div>
          <div className="d-flex gap-2">
            <CButton size="sm" color="outline-secondary" onClick={handleShare}>
              <CIcon icon={cilShareAlt} className="me-1" size="sm" />
              {copied ? 'Copied!' : 'Share'}
            </CButton>
            <CButton size="sm" color="outline-primary" onClick={handleDownloadInvoice} disabled={downloading}>
              {downloading ? <CSpinner size="sm" className="me-1" /> : <CIcon icon={cilCloudDownload} className="me-1" size="sm" />}
              {downloading ? 'Generating…' : 'Download PDF'}
            </CButton>
          </div>
        </div>
      </CCardHeader>

      <CCardBody>
        <CRow className="g-4">

          {/* ── Left column ── */}
          <CCol md={6}>

            {/* Money breakdown */}
            <Section title="Amount Breakdown">
              <div className="border rounded overflow-hidden">
                {[
                  ['Base Amount',          fmt(payment.amountMinor)],
                  ['Platform Fee',         fmt(payment.platformFeeMinor)],
                  ['GST on Platform Fee',  fmt(payment.taxAmountMinor)],
                  ['Gateway Fee',          fmt(payment.gatewayFeeMinor)],
                  ['GST on Gateway',       fmt(payment.gatewayTaxMinor)],
                  ...(discountAmt > 0 ? [['Discount Applied', '-' + fmt(payment.discountAmountMinor)]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="d-flex justify-content-between px-3 py-2 small" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                    <span className="text-muted">{label}</span>
                    <span className="fw-semibold">{value}</span>
                  </div>
                ))}
                <div className="d-flex justify-content-between px-3 py-2 fw-bold" style={{ background: 'var(--cui-tertiary-bg)' }}>
                  <span>Total Charged</span>
                  <span>{fmt(payment.totalAmountMinor)}</span>
                </div>
                {refunded > 0 && (
                  <div className="d-flex justify-content-between px-3 py-2 small text-info" style={{ borderTop: '1px solid var(--cui-border-color)' }}>
                    <span>Total Refunded</span>
                    <span className="fw-semibold">{fmt(payment.refundedAmountMinor)}</span>
                  </div>
                )}
              </div>
            </Section>

            {/* Transaction IDs */}
            <Section title="Transaction IDs">
              <CListGroup flush>
                <InfoRow label="Payment ID (internal)" value={payment.id} mono />
                <InfoRow label="Razorpay Order ID"     value={payment.razorpayOrderId} mono />
                <InfoRow label="Razorpay Payment ID"   value={payment.razorpayPaymentId} mono />
                <InfoRow label="UPI Transaction ID"    value={payment.upiTransactionId} mono />
                <InfoRow label="Bank Reference (RRN)"  value={payment.bankReferenceNumber} mono />
                <InfoRow label="Idempotency Key"       value={payment.idempotencyKey} mono />
              </CListGroup>
            </Section>

            {/* Payment method */}
            <Section title="Payment Method">
              <CListGroup flush>
                <InfoRow label="Method"        value={payment.paymentMethod} />
                <InfoRow label="Currency"      value={payment.currency} />
                <InfoRow label="International" value={payment.gatewayInternational ? 'Yes' : 'No'} />
              </CListGroup>
            </Section>

          </CCol>

          {/* ── Right column ── */}
          <CCol md={6}>

            {/* Payer */}
            <Section title="Payer">
              <CListGroup flush>
                <InfoRow
                  label="Name"
                  value={payment.fromUser?.name}
                  linkTo={payment.fromUser?.id ? `/users/${payment.fromUser.id}` : null}
                  onNavigate={navigate}
                />
                <InfoRow label="Email" value={payment.fromUser?.email} />
                <InfoRow label="Phone" value={payment.fromUser?.phone} />
              </CListGroup>
            </Section>

            <Section title="Recipient (Trip Manager)">
              <CListGroup flush>
                <InfoRow
                  label="Name"
                  value={payment.toUser?.name}
                  linkTo={payment.toUser?.id ? `/users/${payment.toUser.id}` : null}
                  onNavigate={navigate}
                />
                <InfoRow label="Email" value={payment.toUser?.email} />
              </CListGroup>
            </Section>

            {/* Trip */}
            <Section title="Trip">
              <CListGroup flush>
                <InfoRow
                  label="Trip Title"
                  value={payment.trip?.title}
                  linkTo={payment.trip?.id ? `/trips/${payment.trip.id}` : null}
                  onNavigate={navigate}
                />
                <InfoRow label="Destination" value={payment.trip?.destination?.name} />
                <InfoRow label="Trip Dates"  value={payment.trip?.startDate ? `${fmtDate(payment.trip.startDate)} to ${fmtDate(payment.trip.endDate)}` : '-'} />
                <InfoRow label="Trip ID"     value={payment.trip?.id} mono />
              </CListGroup>
            </Section>

            {/* Booking */}
            {payment.participant && (
              <Section title="Booking">
                <CListGroup flush>
                  <InfoRow label="Participant ID"  value={payment.participant.id} mono />
                  <InfoRow label="Booking Status"  value={payment.participant.status} />
                  <InfoRow label="Booking Type"    value={payment.participant.bookingType} />
                </CListGroup>
              </Section>
            )}

            {/* Timestamps */}
            <Section title="Timestamps">
              <CListGroup flush>
                <InfoRow label="Created" value={fmtDateTime(payment.createdAt)} />
                <InfoRow label="Updated" value={fmtDateTime(payment.updatedAt)} />
              </CListGroup>
            </Section>

          </CCol>
        </CRow>

        {/* ── Refunds ── */}
        {payment.refunds?.length > 0 && (
          <Section title={`Refunds (${payment.refunds.length})`}>
            <CTable small hover responsive>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>#</CTableHeaderCell>
                  <CTableHeaderCell>Refund ID</CTableHeaderCell>
                  <CTableHeaderCell>Amount</CTableHeaderCell>
                  <CTableHeaderCell>Reason</CTableHeaderCell>
                  <CTableHeaderCell>Initiated By</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Gateway Ref</CTableHeaderCell>
                  <CTableHeaderCell>Completed</CTableHeaderCell>
                  <CTableHeaderCell>Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {payment.refunds.map((r, i) => (
                  <CTableRow key={r.id}>
                    <CTableDataCell className="small text-muted">{i + 1}</CTableDataCell>
                    <CTableDataCell className="small font-monospace" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.id}</CTableDataCell>
                    <CTableDataCell className="small fw-semibold">{fmt(r.amountMinor)}</CTableDataCell>
                    <CTableDataCell className="small">{r.reason}</CTableDataCell>
                    <CTableDataCell className="small">{r.initiatedBy}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={REFUND_STATUS_COLOR[r.status] || 'secondary'}>{r.status}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="small font-monospace text-muted">{r.externalRefundId || '-'}</CTableDataCell>
                    <CTableDataCell className="small text-muted">{fmtDate(r.completedAt)}</CTableDataCell>
                    <CTableDataCell>
                      <CButton size="sm" color="outline-primary" onClick={() => navigate(`/payments/refunds/${r.id}`)}>
                        <CIcon icon={cilExternalLink} size="sm" />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </Section>
        )}

        {/* ── Payouts ── */}
        {payment.payouts?.length > 0 && (
          <Section title={`Payouts (${payment.payouts.length})`}>
            <CTable small hover responsive>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>#</CTableHeaderCell>
                  <CTableHeaderCell>Payout ID</CTableHeaderCell>
                  <CTableHeaderCell>Gross</CTableHeaderCell>
                  <CTableHeaderCell>Net</CTableHeaderCell>
                  <CTableHeaderCell>Method</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Created</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {payment.payouts.map((p, i) => (
                  <CTableRow key={p.id}>
                    <CTableDataCell className="small text-muted">{i + 1}</CTableDataCell>
                    <CTableDataCell className="small font-monospace" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.id}</CTableDataCell>
                    <CTableDataCell className="small">{fmt(p.amount)}</CTableDataCell>
                    <CTableDataCell className="small fw-semibold">{fmt(p.netAmount)}</CTableDataCell>
                    <CTableDataCell className="small text-muted">{p.dispatchMethod || '-'}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={PAYOUT_STATUS_COLOR[p.status] || 'secondary'}>{p.status}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="small text-muted">{fmtDate(p.createdAt)}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </Section>
        )}

        {/* Raw gateway payload */}
        {payment.payload && (
          <Section title="Gateway Payload">
            <details>
              <summary className="small text-muted" style={{ cursor: 'pointer' }}>Show raw payload</summary>
              <pre className="small mt-2 p-3 rounded" style={{ background: 'var(--cui-tertiary-bg)', overflowX: 'auto', fontSize: 11 }}>
                {JSON.stringify(payment.payload, null, 2)}
              </pre>
            </details>
          </Section>
        )}

      </CCardBody>
    </CCard>
  )
}

export default PaymentDetail
