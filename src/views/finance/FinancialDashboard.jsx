import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CSpinner, CAlert, CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilMoney, cilWallet, cilCash, cilBank,
  cilArrowTop, cilArrowBottom, cilWarning, cilTask,
} from '@coreui/icons'
import { CChartBar } from '@coreui/react-chartjs'
import api from '../../lib/api'

const fetchSummary = () => api.get('/api/admin/finance/summary').then(r => r.data.data)
const fetchDailyRevenue = () => api.get('/api/admin/finance/daily-revenue').then(r => r.data.data)

const fmtCompact = (paise) => {
  const rupees = Number(paise || 0) / 100
  if (rupees >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(2)}Cr`
  if (rupees >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(2)}L`
  if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(1)}K`
  return `₹${rupees.toFixed(0)}`
}

const KpiCard = ({ icon, color, title, value, sub, subColor }) => (
  <CCard className="border-0 shadow-sm h-100">
    <CCardBody className="p-2 p-md-3">
      <div
        className={`rounded-2 d-inline-flex align-items-center justify-content-center bg-${color} bg-opacity-10 mb-2`}
        style={{ width: 36, height: 36 }}
      >
        <CIcon icon={icon} style={{ width: 18, height: 18 }} className={`text-${color}`} />
      </div>
      <div className="fw-bold lh-1 mb-1" style={{ fontSize: '1rem' }}>{value}</div>
      <div className="text-muted" style={{ fontSize: '0.7rem' }}>{title}</div>
      {sub && <div className={`mt-1 ${subColor || 'text-muted'}`} style={{ fontSize: '0.65rem' }}>{sub}</div>}
    </CCardBody>
  </CCard>
)

const FinancialDashboard = () => {
  const navigate = useNavigate()
  const { data: s, isLoading: sLoading, isError: sError } = useQuery({
    queryKey: ['admin-finance-summary'],
    queryFn: fetchSummary,
    refetchInterval: 60_000,
  })

  const { data: daily, isLoading: dLoading } = useQuery({
    queryKey: ['admin-finance-daily'],
    queryFn: fetchDailyRevenue,
  })

  if (sLoading) return <div className="text-center py-5"><CSpinner color="primary" /></div>
  if (sError) return <CAlert color="danger">Failed to load financial summary.</CAlert>

  const barLabels = (daily || []).map(d => {
    const dt = new Date(d.date)
    const mon = dt.toLocaleString('en', { month: 'short' })
    return `${dt.getDate()}-${mon}`
  })
  const barData = (daily || []).map(d => (d.total / 100).toFixed(2))

  return (
    <>
      <CRow className="mb-2">
        <CCol>
          <h4 className="mb-0 fw-bold">Financial Overview</h4>
          <p className="text-muted small mb-0">Month-to-date figures · updates every 60s</p>
        </CCol>
      </CRow>

      {/* Row 1 — Revenue KPIs */}
      <CRow className="g-3 mb-3">
        <CCol xs={6} xl={3}>
          <KpiCard
            icon={cilMoney}
            color="success"
            title="Revenue This Month"
            value={fmtCompact(s.revenueMonth)}
            sub={`All-time: ${fmtCompact(s.totalRevenue)}`}
          />
        </CCol>
        <CCol xs={6} xl={3}>
          <KpiCard
            icon={cilArrowTop}
            color="primary"
            title="GMV This Month"
            value={fmtCompact(s.gmvMonth)}
            sub={`All-time: ${fmtCompact(s.totalGmv)}`}
          />
        </CCol>
        <CCol xs={6} xl={3}>
          <KpiCard
            icon={cilBank}
            color="info"
            title="GST Collected MTD"
            value={fmtCompact(s.gstMonth)}
          />
        </CCol>
        <CCol xs={6} xl={3}>
          <KpiCard
            icon={cilCash}
            color={s.platformBalance >= 0 ? 'success' : 'danger'}
            title="Platform Balance"
            value={fmtCompact(s.platformBalance)}
            sub="Net holding account"
          />
        </CCol>
      </CRow>

      {/* Row 2 — Operations KPIs */}
      <CRow className="g-3 mb-3">
        <CCol xs={6} xl={3}>
          <KpiCard
            icon={cilWallet}
            color="warning"
            title="Pending Payouts"
            value={fmtCompact(s.pendingPayoutsAmount)}
            sub={`${s.pendingPayoutsCount} payouts pending`}
            subColor="text-warning fw-semibold"
          />
        </CCol>
        <CCol xs={6} xl={3}>
          <KpiCard
            icon={cilArrowBottom}
            color="secondary"
            title="Refunds This Month"
            value={fmtCompact(s.refundsMonth)}
            sub={`All-time: ${fmtCompact(s.totalRefunds)}`}
          />
        </CCol>
        <CCol xs={6} xl={3}>
          <KpiCard
            icon={cilWarning}
            color="danger"
            title="Failed Payments (7d)"
            value={s.failedPayments7d}
            sub="Needs attention"
            subColor={s.failedPayments7d > 0 ? 'text-danger fw-semibold' : 'text-muted'}
          />
        </CCol>
        <CCol xs={6} xl={3}>
          <KpiCard
            icon={cilTask}
            color="warning"
            title="On-Hold Payouts"
            value={s.onHoldPayoutsCount}
            sub="Pending review"
            subColor={s.onHoldPayoutsCount > 0 ? 'text-warning fw-semibold' : 'text-muted'}
          />
        </CCol>
      </CRow>

      {/* Row 3 — Charts */}
      <CRow>
        <CCol xl={8}>
          <CCard className="mb-4 shadow-sm">
            <CCardHeader>
              <strong>Daily Revenue</strong>
              <span className="ms-2 text-muted small">last 30 days · platform income (₹)</span>
            </CCardHeader>
            <CCardBody>
              {dLoading ? (
                <div className="text-center py-4"><CSpinner size="sm" /></div>
              ) : (daily || []).length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No ledger data yet.</p>
              ) : (
                <CChartBar
                  data={{
                    labels: barLabels,
                    datasets: [{
                      label: 'Revenue (₹)',
                      backgroundColor: 'rgba(50, 200, 100, 0.4)',
                      borderColor: 'rgba(50, 200, 100, 1)',
                      borderWidth: 1,
                      data: barData,
                    }],
                  }}
                  options={{
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } },
                    responsive: true,
                    maintainAspectRatio: true,
                  }}
                />
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xl={4}>
          <CCard className="mb-4 shadow-sm">
            <CCardHeader><strong>Quick Links</strong></CCardHeader>
            <CCardBody className="p-0">
              {[
                { label: 'All Payments', to: '/payments', badge: null },
                { label: 'Refunds', to: '/payments/refunds', badge: null },
                { label: 'Payout List', to: '/payouts', badge: s.pendingPayoutsCount > 0 ? s.pendingPayoutsCount : null, badgeColor: 'warning' },
                { label: 'Payout Schedule', to: '/payouts/schedule', badge: null },
                { label: 'Payout Methods', to: '/payouts/methods', badge: null },
                { label: 'Linked Accounts', to: '/payouts/linked-accounts', badge: null },
              ].map(({ label, to, badge, badgeColor }) => (
                <div
                  key={to}
                  role="button"
                  onClick={() => navigate(to)}
                  className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom text-body"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="small">{label}</span>
                  {badge !== null && <CBadge color={badgeColor || 'secondary'}>{badge}</CBadge>}
                </div>
              ))}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default FinancialDashboard
