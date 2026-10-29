import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert,
  CFormInput, CFormSelect,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
} from '@coreui/react'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDateTime } from '../../lib/dateUtils'

const CHANNEL_LABEL = {
  SP_INVITE: 'SP Invite',
  APP_SHARE: 'App Share',
  WHATSAPP: 'WhatsApp',
  GENERAL_LINK: 'General Link',
}

const STATUS_COLOR = {
  PENDING: 'warning',
  SIGNED_UP: 'info',
  QUALIFIED: 'success',
  EXPIRED: 'secondary',
  CANCELLED: 'dark',
}

const fetchReferrals = async ({ limit, offset, search, status, channel, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  if (channel) params.set('channel', channel)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/referrals?${params}`)
  return res.data.data
}

const fetchReferralStats = async () => {
  const res = await api.get('/api/admin/referrals/stats')
  return res.data.data
}

const ReferralList = () => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [detailsReferral, setDetailsReferral] = useState(null)

  const offset = (page - 1) * pageSize

  const handleSort = (field, order) => { setSortBy(field); setSortOrder(order); setPage(1) }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-referrals', { page, pageSize, search, statusFilter, channelFilter, sortBy, sortOrder }],
    queryFn: () =>
      fetchReferrals({
        limit: pageSize,
        offset,
        search,
        status: statusFilter,
        channel: channelFilter,
        sortBy,
        sortOrder,
      }),
    placeholderData: (prev) => prev,
  })

  const { data: stats } = useQuery({
    queryKey: ['admin-referrals-stats'],
    queryFn: fetchReferralStats,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <CCard>
      <CCardHeader>
        <strong>Referrals</strong>
        <span className="ms-2 text-muted small">
          Every "invite a friend" / SP-invite sent across the platform
        </span>
        {stats && (
          <span className="ms-3 small text-muted">
            {stats.total} sent &middot; {stats.converted} converted &middot; {(stats.conversionRate * 100).toFixed(1)}% rate
          </span>
        )}
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3 g-2">
          <CCol md={5}>
            <form onSubmit={handleSearch} className="d-flex gap-2">
              <CFormInput
                size="sm"
                placeholder="Search referrer, referee, name, email, phone."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <CButton type="submit" color="primary" size="sm">Search</CButton>
            </form>
          </CCol>
          <CCol md={3}>
            <CFormSelect
              size="sm"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            >
              <option value="">Status: all</option>
              <option value="PENDING">Pending</option>
              <option value="SIGNED_UP">Signed Up</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </CFormSelect>
          </CCol>
          <CCol md={4}>
            <CFormSelect
              size="sm"
              value={channelFilter}
              onChange={(e) => { setChannelFilter(e.target.value); setPage(1) }}
            >
              <option value="">Channel: all</option>
              <option value="SP_INVITE">SP Invite</option>
              <option value="APP_SHARE">App Share</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="GENERAL_LINK">General Link</option>
            </CFormSelect>
          </CCol>
        </CRow>

        {isLoading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
        {isError && <CAlert color="danger">Failed to load referrals.</CAlert>}

        {data && data.referrals.length === 0 && (
          <p className="text-muted small">No referrals yet.</p>
        )}

        {data && data.referrals.length > 0 && (
          <>
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <CTableHeaderCell>Referrer</CTableHeaderCell>
                  <CTableHeaderCell>Referee</CTableHeaderCell>
                  <CTableHeaderCell>Channel</CTableHeaderCell>
                  <SortableHeader field="status" label="Status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader field="createdAt" label="Sent" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell style={{ width: 90 }}>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.referrals.map((r, idx) => (
                  <CTableRow key={r.id}>
                    <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                    <CTableDataCell className="small">
                      <div className="fw-semibold">{r.referrer?.name}</div>
                      <div className="text-muted">{r.referrer?.email}</div>
                    </CTableDataCell>
                    <CTableDataCell className="small">
                      {r.referee ? (
                        <>
                          <div className="fw-semibold">{r.referee.name}</div>
                          <div className="text-muted">{r.referee.email}</div>
                        </>
                      ) : (
                        <>
                          <div className="text-muted fst-italic">Not signed up yet</div>
                          {(r.inviteeName || r.refereeEmail || r.refereePhone) && (
                            <div className="text-muted">
                              {r.inviteeName || r.refereeEmail || r.refereePhone}
                            </div>
                          )}
                        </>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="light" textColor="dark" className="border">
                        {CHANNEL_LABEL[r.channel] || r.channel}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={STATUS_COLOR[r.status] || 'secondary'}>
                        {r.status}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="small text-muted">{fmtDateTime(r.createdAt)}</CTableDataCell>
                    <CTableDataCell>
                      <CButton size="sm" color="secondary" variant="outline" onClick={() => setDetailsReferral(r)}>
                        View
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
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
            />
          </>
        )}
      </CCardBody>

      <CModal visible={!!detailsReferral} onClose={() => setDetailsReferral(null)} alignment="center">
        <CModalHeader>
          <CModalTitle>Referral Details</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {detailsReferral && (
            <table className="table table-sm table-borderless mb-0">
              <tbody>
                <tr>
                  <td className="text-muted" style={{ width: 160 }}>Referrer</td>
                  <td>
                    {detailsReferral.referrer?.name}
                    <div className="text-muted small">
                      {detailsReferral.referrer?.email}
                      {detailsReferral.referrer?.phone ? ` · ${detailsReferral.referrer.phone}` : ''}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="text-muted">Referee</td>
                  <td>
                    {detailsReferral.referee ? (
                      <>
                        {detailsReferral.referee.name}
                        <div className="text-muted small">
                          {detailsReferral.referee.email}
                          {detailsReferral.referee.phone ? ` · ${detailsReferral.referee.phone}` : ''}
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-muted fst-italic">Not signed up yet</span>
                        {detailsReferral.inviteeName && <div>{detailsReferral.inviteeName}</div>}
                        <div className="text-muted small">
                          {[detailsReferral.refereeEmail, detailsReferral.refereePhone].filter(Boolean).join(' · ')}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="text-muted">Channel</td>
                  <td>{CHANNEL_LABEL[detailsReferral.channel] || detailsReferral.channel}</td>
                </tr>
                <tr>
                  <td className="text-muted">Status</td>
                  <td><CBadge color={STATUS_COLOR[detailsReferral.status] || 'secondary'}>{detailsReferral.status}</CBadge></td>
                </tr>
                <tr>
                  <td className="text-muted">Milestone</td>
                  <td>{detailsReferral.milestone}</td>
                </tr>
                {detailsReferral.destination && (
                  <tr>
                    <td className="text-muted">Destination</td>
                    <td>{detailsReferral.destination.name}</td>
                  </tr>
                )}
                {detailsReferral.message && (
                  <tr>
                    <td className="text-muted">Message</td>
                    <td>{detailsReferral.message}</td>
                  </tr>
                )}
                {detailsReferral.token && (
                  <tr>
                    <td className="text-muted">Invite token</td>
                    <td className="small font-monospace">{detailsReferral.token}</td>
                  </tr>
                )}
                <tr>
                  <td className="text-muted">Notified via</td>
                  <td>
                    {[
                      detailsReferral.notifiedViaEmail ? 'Email' : null,
                      detailsReferral.notifiedViaSms ? 'SMS' : null,
                    ].filter(Boolean).join(', ') || '—'}
                  </td>
                </tr>
                <tr>
                  <td className="text-muted">Sent</td>
                  <td>{fmtDateTime(detailsReferral.createdAt)}</td>
                </tr>
                <tr>
                  <td className="text-muted">Last updated</td>
                  <td>{fmtDateTime(detailsReferral.updatedAt)}</td>
                </tr>
                {detailsReferral.expiresAt && (
                  <tr>
                    <td className="text-muted">Expires</td>
                    <td>{fmtDateTime(detailsReferral.expiresAt)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDetailsReferral(null)}>Close</CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  )
}

export default ReferralList
