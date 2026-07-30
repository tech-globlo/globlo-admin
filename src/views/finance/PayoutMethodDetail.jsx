import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CBadge, CButton, CSpinner, CAlert,
  CListGroup, CListGroupItem,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CNav, CNavItem, CNavLink, CTabContent, CTabPane,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const fmt = (paise) => {
  if (paise == null) return '-'
  return '₹' + (Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

const PAYOUT_STATUS_COLOR = {
  SCHEDULED: 'warning', READY: 'info', PROCESSING: 'info',
  SUCCESS: 'success', FAILED: 'danger', ON_HOLD: 'dark',
  CANCELLED: 'secondary',
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

const PayoutMethodDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = React.useState('details')
  const [confirmVerify, setConfirmVerify] = React.useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-payout-method', id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/payout-methods/${id}`)
      return res.data.data
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () => api.post(`/api/admin/payout-methods/${id}/verify`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payout-method', id] })
      qc.invalidateQueries({ queryKey: ['admin-payout-methods'] })
      setConfirmVerify(false)
    },
  })

  if (isLoading) return <div className="text-center py-5"><CSpinner color="primary" /></div>
  if (isError || !data) return <CAlert color="danger">Failed to load payout method.</CAlert>

  const { method, payouts } = data

  const totalTransferred = payouts
    .filter(p => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + Number(p.netAmount || 0), 0)

  const initials = method.user?.name
    ? method.user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <CCard>
      <CCardHeader className="pb-0">
        <CButton color="link" className="p-0 mb-3 text-muted small d-block" onClick={() => navigate(-1)}>
          <CIcon icon={cilArrowLeft} className="me-1" size="sm" />Back
        </CButton>

        {/* Header strip */}
        <div className="d-flex align-items-center gap-3 mb-3">
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: '#321fdb', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 18,
          }}>{initials}</div>
          <div className="flex-grow-1">
            <div className="fw-semibold">{method.user?.name || '-'}</div>
            <div className="small text-muted">{method.user?.email}</div>
            <div className="d-flex gap-1 mt-1 flex-wrap">
              <CBadge color="light" textColor="dark">{method.user?.role}</CBadge>
              <CBadge color="info">{method.type}</CBadge>
              <CBadge color={method.verified ? 'success' : 'warning'}>
                {method.verified ? 'Verified' : 'Unverified'}
              </CBadge>
              {method.primary && <CBadge color="dark">Primary</CBadge>}
            </div>
          </div>
          {/* Transfer summary */}
          <div className="text-end">
            <div className="fw-bold fs-5">₹{(totalTransferred / 100).toLocaleString('en-IN')}</div>
            <div className="small text-muted">Total Transferred</div>
            <div className="small text-muted">{payouts.filter(p => p.status === 'SUCCESS').length} of {payouts.length} payouts</div>
            {!method.verified && (
              <CButton
                color="success"
                size="sm"
                className="mt-2"
                onClick={() => setConfirmVerify(true)}
              >
                Verify
              </CButton>
            )}
          </div>
        </div>

        <CNav variant="underline-border">
          <CNavItem>
            <CNavLink active={activeTab === 'details'} onClick={() => setActiveTab('details')} style={{ cursor: 'pointer' }}>
              Method Details
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink active={activeTab === 'transfers'} onClick={() => setActiveTab('transfers')} style={{ cursor: 'pointer' }}>
              Transfer History ({payouts.length})
            </CNavLink>
          </CNavItem>
        </CNav>
      </CCardHeader>

      <CCardBody>
        <CTabContent>

          {/* ── Method Details tab ── */}
          <CTabPane visible={activeTab === 'details'}>
            <CRow className="g-4">
              <CCol md={6}>
                <Section title="Payout Method Info">
                  <CListGroup flush>
                    <InfoRow label="Internal ID" value={method.id} mono />
                    <InfoRow label="Type" value={method.type} />
                    <InfoRow label="Label" value={method.label} />
                    {method.type === 'UPI' ? (
                      <InfoRow label="UPI ID" value={method.upiId} mono />
                    ) : (
                      <>
                        <InfoRow label="Account Holder Name" value={method.accountHolderName} />
                        <InfoRow label="Account Number" value={method.accountNumberMasked} mono />
                        <InfoRow label="IFSC Code" value={method.ifscCode} mono />
                        <InfoRow label="Bank Name" value={method.bankName} />
                      </>
                    )}
                    <InfoRow label="Verified" value={method.verified ? 'Yes' : 'No'} />
                    <InfoRow label="Primary" value={method.primary ? 'Yes' : 'No'} />
                    <InfoRow label="Created" value={fmtDateTime(method.createdAt)} />
                    <InfoRow label="Updated" value={fmtDateTime(method.updatedAt)} />
                  </CListGroup>
                </Section>
              </CCol>
              <CCol md={6}>
                <Section title="Razorpay References">
                  <CListGroup flush>
                    <InfoRow label="Contact ID" value={method.razorpayContactId} mono />
                    <InfoRow label="Fund Account ID" value={method.razorpayFundAccountId} mono />
                    <InfoRow label="Fund Account Type" value={method.razorpayFundAccountType} />
                  </CListGroup>
                </Section>
                <Section title="Account Holder">
                  <CListGroup flush>
                    <InfoRow label="User ID" value={method.userId} mono />
                    <InfoRow label="Name" value={method.user?.name} />
                    <InfoRow label="Email" value={method.user?.email} />
                    <InfoRow label="Phone" value={method.user?.phone} />
                    <InfoRow label="Role" value={method.user?.role} />
                  </CListGroup>
                </Section>
              </CCol>
            </CRow>
          </CTabPane>

          {/* ── Transfer History tab ── */}
          <CTabPane visible={activeTab === 'transfers'}>
            {payouts.length === 0 ? (
              <div className="text-center py-4 text-muted small">No transfers found for this user.</div>
            ) : (
              <>
                {/* Summary chips */}
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {['SUCCESS', 'SCHEDULED', 'PROCESSING', 'FAILED', 'ON_HOLD', 'CANCELLED'].map(s => {
                    const count = payouts.filter(p => p.status === s).length
                    if (!count) return null
                    return (
                      <div key={s} className="d-flex align-items-center gap-1">
                        <CBadge color={PAYOUT_STATUS_COLOR[s] || 'secondary'}>{s}</CBadge>
                        <span className="small text-muted">{count}</span>
                      </div>
                    )
                  })}
                </div>

                <CTable small hover responsive>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell>#</CTableHeaderCell>
                      <CTableHeaderCell>Trip</CTableHeaderCell>
                      <CTableHeaderCell>Gross</CTableHeaderCell>
                      <CTableHeaderCell>Platform Fee</CTableHeaderCell>
                      <CTableHeaderCell>Net (Transferred)</CTableHeaderCell>
                      <CTableHeaderCell>Method</CTableHeaderCell>
                      <CTableHeaderCell>Mode</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Gateway Ref</CTableHeaderCell>
                      <CTableHeaderCell>Initiated</CTableHeaderCell>
                      <CTableHeaderCell>Completed</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {payouts.map((p, i) => (
                      <CTableRow key={p.id}>
                        <CTableDataCell className="small text-muted">{i + 1}</CTableDataCell>
                        <CTableDataCell className="small">{p.trip?.title || '-'}</CTableDataCell>
                        <CTableDataCell className="small">{fmt(p.amount)}</CTableDataCell>
                        <CTableDataCell className="small text-muted">{fmt(p.platformFee)}</CTableDataCell>
                        <CTableDataCell className="small fw-semibold">{fmt(p.netAmount)}</CTableDataCell>
                        <CTableDataCell className="small">{p.dispatchMethod || '-'}</CTableDataCell>
                        <CTableDataCell className="small">{p.mode || '-'}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={PAYOUT_STATUS_COLOR[p.status] || 'secondary'}>{p.status}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="small font-monospace text-muted" style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.razorpayTransferId || p.razorpayPayoutId || '-'}
                        </CTableDataCell>
                        <CTableDataCell className="small text-muted">{fmtDate(p.initiatedAt)}</CTableDataCell>
                        <CTableDataCell className="small text-muted">{fmtDate(p.completedAt)}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>

                {/* Failure reasons */}
                {payouts.some(p => p.failureReason) && (
                  <div className="mt-3">
                    <div className="small fw-bold text-uppercase text-muted mb-2" style={{ letterSpacing: 1 }}>Failure Notes</div>
                    {payouts.filter(p => p.failureReason).map(p => (
                      <div key={p.id} className="small p-2 mb-1 rounded bg-body-secondary">
                        <span className="font-monospace text-muted me-2">{p.id.slice(0, 8)}.</span>
                        <span className="text-danger">{p.failureReason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CTabPane>

        </CTabContent>
      </CCardBody>

      <CModal visible={confirmVerify} onClose={() => setConfirmVerify(false)}>
        <CModalHeader>
          <CModalTitle>Verify Payout Method</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-2">
            Confirm the account details below match what {method.user?.name || 'the user'} submitted, then mark this payout method as verified.
          </p>
          {method.type === 'UPI' ? (
            <div className="small font-monospace bg-body-secondary rounded p-2">{method.upiId}</div>
          ) : (
            <div className="small font-monospace bg-body-secondary rounded p-2">
              {method.accountHolderName} · {method.accountNumberMasked} · {method.ifscCode}
            </div>
          )}
          {verifyMutation.isError && (
            <CAlert color="danger" className="mt-3 mb-0">
              {verifyMutation.error?.response?.data?.message || 'Failed to verify payout method.'}
            </CAlert>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setConfirmVerify(false)}>
            Cancel
          </CButton>
          <CButton color="success" disabled={verifyMutation.isLoading} onClick={() => verifyMutation.mutate()}>
            {verifyMutation.isLoading ? <CSpinner size="sm" /> : 'Confirm Verify'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  )
}

export default PayoutMethodDetail
