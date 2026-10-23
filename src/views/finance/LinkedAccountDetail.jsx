import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CBadge, CButton, CSpinner, CAlert,
  CListGroup, CListGroupItem,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CNav, CNavItem, CNavLink, CTabContent, CTabPane,
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
const KYC_COLOR = { verified: 'success', rejected: 'danger', pending: 'warning' }

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

const LinkedAccountDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = React.useState('details')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-linked-account', id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/linked-accounts/${id}`)
      return res.data.data
    },
  })

  if (isLoading) return <div className="text-center py-5"><CSpinner color="primary" /></div>
  if (isError || !data) return <CAlert color="danger">Failed to load linked account.</CAlert>

  const { account, payouts } = data

  const totalTransferred = payouts
    .filter(p => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + Number(p.netAmount || 0), 0)

  const initials = account.user?.name
    ? account.user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <CCard>
      <CCardHeader className="pb-0">
        <CButton color="secondary" size="sm" className="mb-3" onClick={() => navigate(-1)}>
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
            <div className="fw-semibold">{account.user?.name || '-'}</div>
            <div className="small text-muted">{account.user?.email}</div>
            <div className="d-flex gap-1 mt-1 flex-wrap">
              <CBadge color="light" textColor="dark">{account.user?.role}</CBadge>
              <CBadge color={account.isActive ? 'success' : 'secondary'}>
                {account.isActive ? 'Active' : 'Inactive'}
              </CBadge>
              {account.kycStatus && (
                <CBadge color={KYC_COLOR[account.kycStatus] || 'warning'}>
                  KYC: {account.kycStatus}
                </CBadge>
              )}
            </div>
          </div>
          {/* Transfer summary */}
          <div className="text-end">
            <div className="fw-bold fs-5">₹{(totalTransferred / 100).toLocaleString('en-IN')}</div>
            <div className="small text-muted">Total Transferred</div>
            <div className="small text-muted">{payouts.filter(p => p.status === 'SUCCESS').length} of {payouts.length} payouts</div>
          </div>
        </div>

        <CNav variant="underline-border">
          <CNavItem>
            <CNavLink active={activeTab === 'details'} onClick={() => setActiveTab('details')} style={{ cursor: 'pointer' }}>
              Account Details
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

          {/* ── Account Details tab ── */}
          <CTabPane visible={activeTab === 'details'}>
            <CRow className="g-4">
              <CCol md={6}>
                <Section title="Account Info">
                  <CListGroup flush>
                    <InfoRow label="Internal ID"       value={account.id} mono />
                    <InfoRow label="Gateway"           value={account.gateway} />
                    <InfoRow label="Gateway Account ID" value={account.accountId} mono />
                    <InfoRow label="Entity Type"       value={account.entity} />
                    <InfoRow label="Product Config ID" value={account.productConfigId} mono />
                    <InfoRow label="Current Status"    value={account.currentStatus} />
                    <InfoRow label="Onboard Status"    value={account.onboardStatus} />
                    <InfoRow label="Active"            value={account.isActive ? 'Yes' : 'No'} />
                    <InfoRow label="Created"           value={fmtDateTime(account.createdAt)} />
                    <InfoRow label="Updated"           value={fmtDateTime(account.updatedAt)} />
                  </CListGroup>
                </Section>
              </CCol>
              <CCol md={6}>
                <Section title="KYC">
                  <CListGroup flush>
                    <InfoRow label="KYC Status" value={
                      account.kycStatus
                        ? <CBadge color={KYC_COLOR[account.kycStatus] || 'secondary'}>{account.kycStatus}</CBadge>
                        : '-'
                    } />
                    <InfoRow label="KYC Rejection Reason" value={account.kycRejectionReason} />
                  </CListGroup>
                </Section>
                <Section title="Account Holder">
                  <CListGroup flush>
                    <InfoRow label="User ID" value={account.userId} mono />
                    <InfoRow label="Name"    value={account.user?.name} />
                    <InfoRow label="Email"   value={account.user?.email} />
                    <InfoRow label="Phone"   value={account.user?.phone} />
                    <InfoRow label="Role"    value={account.user?.role} />
                  </CListGroup>
                </Section>
              </CCol>
            </CRow>
          </CTabPane>

          {/* ── Transfer History tab ── */}
          <CTabPane visible={activeTab === 'transfers'}>
            {payouts.length === 0 ? (
              <div className="text-center py-4 text-muted small">No transfers found for this account.</div>
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
                      <CTableHeaderCell>Payment</CTableHeaderCell>
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
                        <CTableDataCell className="small">
                          {p.payment?.id ? (
                            <span
                              role="button"
                              className="text-primary"
                              style={{ cursor: 'pointer' }}
                              onClick={() => navigate(`/payments/${p.payment.id}`)}
                            >
                              {fmt(p.payment.totalAmountMinor)}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="small">{fmt(p.amount)}</CTableDataCell>
                        <CTableDataCell className="small text-muted">{fmt(p.platformFee)}</CTableDataCell>
                        <CTableDataCell className="small fw-semibold">{fmt(p.netAmount)}</CTableDataCell>
                        <CTableDataCell className="small">{p.dispatchMethod || '-'}</CTableDataCell>
                        <CTableDataCell className="small">{p.mode || '-'}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={PAYOUT_STATUS_COLOR[p.status] || 'secondary'}>{p.status}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="small font-monospace text-muted" style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.razorpayTransferId || p.razorpayPayoutId || p.razorpayAccountId || '-'}
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
    </CCard>
  )
}

export default LinkedAccountDetail
