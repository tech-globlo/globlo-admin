import React from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CBadge,
  CButton,
} from '@coreui/react'
import { fmtDateTime } from '../lib/dateUtils'
import { formatRupees } from '../lib/constants'

const fmtPrice = (minor) => (minor == null ? '-' : formatRupees(minor, { decimals: 0 }))

export const PARTICIPANT_MILESTONE_STATUS_COLOR = {
  PENDING: 'warning',
  DUE: 'info',
  PAID: 'success',
  CANCELLED: 'secondary',
}

export const PAYMENT_STATUS_COLOR = {
  PAID: 'success',
  PENDING: 'warning',
  CANCELLED: 'secondary',
  REFUNDED: 'info',
  PARTIALLY_REFUNDED: 'info',
  FAILED: 'danger',
}

// Shared by TripDetail.jsx (per-participant modal, scoped to one trip) and
// PaymentSchedule.jsx (cross-trip "what's due across the platform" list) —
// same milestone shape either way, single source of truth for how it renders.
// Sibling of the payout-side MilestoneTable — participant installments have
// a real `status` enum instead of one derived from cancelledAt/payoutId, and
// carry their own `label` (e.g. "Booking Amount", "T-2M") copied from the
// PolicyConfig template at generation time, so the columns differ slightly.
// onViewPayment: optional (paymentId) => void — when given, a milestone with
// a linked Payment gets a "View Payment" action (drill-down into
// PaymentDetail.jsx), same precedent as the payout-side MilestoneTable's
// "View Payout" button.
export const ParticipantMilestoneTable = ({ milestones, onViewPayment }) => (
  <CTable small hover responsive className="mb-0">
    <CTableHead color="light">
      <CTableRow>
        <CTableHeaderCell>#</CTableHeaderCell>
        <CTableHeaderCell>Label</CTableHeaderCell>
        <CTableHeaderCell>Share</CTableHeaderCell>
        <CTableHeaderCell>Amount</CTableHeaderCell>
        <CTableHeaderCell>Scheduled At</CTableHeaderCell>
        <CTableHeaderCell>Status</CTableHeaderCell>
        <CTableHeaderCell>Payment</CTableHeaderCell>
        {onViewPayment && <CTableHeaderCell>Action</CTableHeaderCell>}
      </CTableRow>
    </CTableHead>
    <CTableBody>
      {milestones.map((m) => (
        <CTableRow key={m.id}>
          <CTableDataCell className="small text-muted">{m.position + 1}</CTableDataCell>
          <CTableDataCell className="small">{m.label || '-'}</CTableDataCell>
          <CTableDataCell className="small">{Math.round(m.sharePct * 100)}%</CTableDataCell>
          <CTableDataCell className="small fw-semibold">{fmtPrice(m.amountMinor)}</CTableDataCell>
          <CTableDataCell className="small text-muted">{fmtDateTime(m.scheduledAt)}</CTableDataCell>
          <CTableDataCell>
            <CBadge color={PARTICIPANT_MILESTONE_STATUS_COLOR[m.status] || 'secondary'}>
              {m.status}
            </CBadge>
          </CTableDataCell>
          <CTableDataCell className="small text-muted">
            {m.payment ? (
              <CBadge color={PAYMENT_STATUS_COLOR[m.payment.status] || 'secondary'}>
                {m.payment.status}
              </CBadge>
            ) : (
              '-'
            )}
          </CTableDataCell>
          {onViewPayment && (
            <CTableDataCell>
              {m.payment ? (
                <CButton size="sm" color="outline-primary" onClick={() => onViewPayment(m.payment.id)}>
                  View Payment
                </CButton>
              ) : (
                <span className="small text-muted">-</span>
              )}
            </CTableDataCell>
          )}
        </CTableRow>
      ))}
    </CTableBody>
  </CTable>
)
