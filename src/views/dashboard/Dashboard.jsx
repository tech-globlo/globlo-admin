import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CCard, CCardBody, CCol, CRow, CSpinner, CAlert, CBadge } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPeople,
  cilLocationPin,
  cilWallet,
  cilBadge,
  cilMap,
  cilTask,
  cilWarning,
  cilBan,
  cilCheckCircle,
  cilExternalLink,
} from '@coreui/icons'
import api from '../../lib/api'

const fetchStats = async () => {
  const res = await api.get('/api/admin/stats')
  return res.data.data
}

const formatRupees = (paiseStr) => {
  const paise = Number(paiseStr || 0)
  const rupees = paise / 100
  if (rupees >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(1)}Cr`
  if (rupees >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(1)}L`
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`
  return `₹${rupees.toFixed(0)}`
}

const KpiCard = ({ icon, color, title, value, sub, subColor = 'text-muted' }) => (
  <CCard className="mb-4 border-0 shadow-sm">
    <CCardBody className="d-flex align-items-center gap-3">
      <div
        className={`rounded-3 d-flex align-items-center justify-content-center bg-${color} bg-opacity-10`}
        style={{ width: 52, height: 52, flexShrink: 0 }}
      >
        <CIcon icon={icon} style={{ width: 26, height: 26 }} className={`text-${color}`} />
      </div>
      <div>
        <div className="fs-5 fw-bold lh-1">{value}</div>
        <div className="small text-muted mt-1">{title}</div>
        {sub && <div className={`small mt-1 ${subColor}`}>{sub}</div>}
      </div>
    </CCardBody>
  </CCard>
)

const QueueBadge = ({ label, count, color, onClick }) => (
  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
    <span className="small">{label}</span>
    <div className="d-flex align-items-center gap-2">
      <CBadge color={count > 0 ? color : 'secondary'} shape="rounded-pill">
        {count}
      </CBadge>
      {onClick && (
        <CIcon
          icon={cilExternalLink}
          role="button"
          size="sm"
          className="text-muted"
          style={{ cursor: 'pointer' }}
          onClick={onClick}
        />
      )}
    </div>
  </div>
)

const Dashboard = () => {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchStats,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
        <CSpinner color="primary" />
      </div>
    )
  }

  if (isError) {
    return (
      <CAlert color="danger">
        {error?.response?.data?.message || 'Failed to load dashboard stats'}
      </CAlert>
    )
  }

  const { users, trips, finance, queue } = data

  return (
    <>
      <h4 className="mb-4 fw-semibold">Dashboard</h4>

      {/* Row 1 - Users & Trips */}
      <CRow>
        <CCol sm={6} xl={3}>
          <KpiCard
            icon={cilPeople}
            color="primary"
            title="Total Users"
            value={users.total.toLocaleString()}
            sub={`${users.photographers} Photographers - ${users.serviceProviders} SPs - ${users.tripManagers} TMs`}
          />
        </CCol>
        <CCol sm={6} xl={3}>
          <KpiCard
            icon={cilLocationPin}
            color="info"
            title="Trips"
            value={trips.total.toLocaleString()}
            sub={`${trips.active} live`}
            subColor="text-success"
          />
        </CCol>
        <CCol sm={6} xl={3}>
          <KpiCard
            icon={cilWallet}
            color="success"
            title="Revenue This Month"
            value={formatRupees(finance.revenueTotal)}
            sub={`All-time: ${formatRupees(finance.revenueAllTime)}`}
          />
        </CCol>
        <CCol sm={6} xl={3}>
          <KpiCard
            icon={users.suspended > 0 ? cilBan : cilCheckCircle}
            color={users.suspended > 0 ? 'warning' : 'success'}
            title="Suspended Users"
            value={users.suspended}
            sub={users.suspended > 0 ? 'Action may be required' : 'No suspended users'}
            subColor={users.suspended > 0 ? 'text-warning' : 'text-success'}
          />
        </CCol>
      </CRow>

      {/* Row 2 - Finance & Queue */}
      <CRow>
        <CCol md={6} xl={3}>
          <CCard className="mb-4 border-0 shadow-sm">
            <CCardBody>
              <div className="d-flex align-items-center mb-3">
                <CIcon icon={cilWallet} className="me-2 text-warning" />
                <strong>Payouts</strong>
              </div>
              <QueueBadge
                label="Pending / Scheduled"
                count={finance.pendingPayouts}
                color="warning"
                onClick={() => navigate('/payouts')}
              />
              <QueueBadge
                label="On Hold"
                count={finance.onHoldPayouts}
                color="danger"
                onClick={() => navigate('/payouts')}
              />
              <QueueBadge
                label="Payout methods unverified"
                count={queue.pendingPayoutMethodVerifications}
                color="warning"
                onClick={() => navigate('/payouts/methods')}
              />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={6} xl={3}>
          <CCard className="mb-4 border-0 shadow-sm">
            <CCardBody>
              <div className="d-flex align-items-center mb-3">
                <CIcon icon={cilBadge} className="me-2 text-primary" />
                <strong>Verification Queue</strong>
              </div>
              <QueueBadge
                label="SP verifications pending"
                count={queue.pendingSpVerifications}
                color="primary"
                onClick={() => navigate('/verification/service-providers')}
              />
              <QueueBadge
                label="Documents pending"
                count={queue.pendingVerificationDocuments}
                color="primary"
                onClick={() => navigate('/verification/documents')}
              />
              <QueueBadge
                label="Destination requests"
                count={queue.pendingDestRequests}
                color="info"
                onClick={() => navigate('/destinations/requests')}
              />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={6} xl={3}>
          <CCard className="mb-4 border-0 shadow-sm">
            <CCardBody>
              <div className="d-flex align-items-center mb-3">
                <CIcon icon={cilTask} className="me-2 text-danger" />
                <strong>Open Cases</strong>
              </div>
              <QueueBadge
                label="Active cases (open + in-progress)"
                count={queue.openCases}
                color="danger"
                onClick={() => navigate('/cases')}
              />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={6} xl={3}>
          <CCard className="mb-4 border-0 shadow-sm">
            <CCardBody>
              <div className="d-flex align-items-center mb-3">
                <CIcon icon={cilWallet} className="me-2 text-info" />
                <strong>Refunds</strong>
              </div>
              <QueueBadge
                label="Requested"
                count={queue.pendingRefundRequests}
                color="info"
                onClick={() => navigate('/payments/refunds')}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Dashboard
