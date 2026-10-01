﻿import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useSearchParamsState } from '../../hooks/useSearchParamState'
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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilZoomIn } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const STATUS_COLOR = {
  OPEN: 'danger',
  IN_PROGRESS: 'warning',
  AWAITING_REPLY: 'info',
  RESOLVED: 'success',
  CLOSED: 'secondary',
}
const STATUS_LABEL = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  AWAITING_REPLY: 'Awaiting Reply',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}
const PRIORITY_COLOR = { CRITICAL: 'danger', URGENT: 'warning', NORMAL: 'secondary' }

const fetchCases = async ({ limit, offset, status, priority, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (status) params.set('status', status)
  if (priority) params.set('priority', priority)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/cases?${params}`)
  return res.data.data
}

const fetchCaseStats = async () => {
  const statuses = ['OPEN', 'IN_PROGRESS', 'AWAITING_REPLY', 'RESOLVED']
  const results = await Promise.all(
    statuses.map((s) =>
      api.get(`/api/admin/cases?limit=1&offset=0&status=${s}`).then((r) => ({
        status: s,
        count: r.data.data.total,
      })),
    ),
  )
  const all = await api.get('/api/admin/cases?limit=1&offset=0')
  return { stats: results, total: all.data.data.total }
}

const CaseList = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useSearchParamsState({
    page: { default: 1, type: 'number' },
    pageSize: { default: 20, type: 'number' },
    status: { default: '' },
    priority: { default: '' },
    sortBy: { default: 'createdAt' },
    sortOrder: { default: 'desc' },
  })
  const { page, pageSize, status, priority, sortBy, sortOrder } = filters
  const offset = (page - 1) * pageSize

  const handleSort = (field, order) => {
    setFilters({ sortBy: field, sortOrder: order, page: 1 })
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-cases', { page, pageSize, status, priority, sortBy, sortOrder }],
    queryFn: () => fetchCases({ limit: pageSize, offset, status, priority, sortBy, sortOrder }),
    placeholderData: (prev) => prev,
  })

  const { data: statsData } = useQuery({
    queryKey: ['admin-cases-stats'],
    queryFn: fetchCaseStats,
    staleTime: 30000,
  })

  return (
    <CCard>
      <CCardHeader>
        <strong>Cases</strong>
      </CCardHeader>
      {statsData && (
        <div className="d-flex border-bottom" style={{ background: '#f8f9fa' }}>
          {[
            { label: 'Open Cases', status: 'OPEN', color: 'danger' },
            { label: 'In Progress', status: 'IN_PROGRESS', color: 'warning' },
            { label: 'Awaiting Reply', status: 'AWAITING_REPLY', color: 'info' },
            { label: 'Resolved', status: 'RESOLVED', color: 'success' },
            { label: 'Total Requests', status: null, color: 'primary' },
          ].map(({ label, status: s, color }) => {
            const count =
              s === null
                ? statsData.total
                : (statsData.stats.find((x) => x.status === s)?.count ?? 0)
            return (
              <div
                key={label}
                className="flex-fill text-center py-3 px-2"
                style={{
                  borderRight: '1px solid #dee2e6',
                  cursor: s ? 'pointer' : 'default',
                  background: status === s ? '#e9ecef' : 'transparent',
                }}
                onClick={() => {
                  if (s) {
                    setFilters({ status: status === s ? '' : s, page: 1 })
                  }
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 700 }} className={`text-${color}`}>
                  {count}
                </div>
                <div className="text-muted" style={{ fontSize: 11 }}>
                  {label}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <CCardBody>
        <CRow className="mb-3 g-2">
          <CCol md={3}>
            <CFormSelect
              size="sm"
              value={status}
              onChange={(e) => setFilters({ status: e.target.value, page: 1 })}
            >
                      <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="AWAITING_REPLY">Awaiting Reply</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </CFormSelect>
          </CCol>
          <CCol md={3}>
            <CFormSelect
              size="sm"
              value={priority}
              onChange={(e) => setFilters({ priority: e.target.value, page: 1 })}
            >
              <option value="">All priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="URGENT">Urgent</option>
              <option value="NORMAL">Normal</option>
            </CFormSelect>
          </CCol>
        </CRow>

        {isLoading && (
          <div className="text-center py-4">
            <CSpinner color="primary" />
          </div>
        )}
        {isError && <CAlert color="danger">Failed to load cases.</CAlert>}

        {data && (
          <>
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <CTableHeaderCell>Raised By</CTableHeaderCell>
                  <CTableHeaderCell>Trip</CTableHeaderCell>
                  <CTableHeaderCell>Reason</CTableHeaderCell>
                  <SortableHeader
                    field="priority"
                    label="Priority"
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
                  <CTableHeaderCell>Logs</CTableHeaderCell>
                  <SortableHeader
                    field="createdAt"
                    label="Created"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <CTableHeaderCell>Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.cases.map((c, idx) => (
                  <CTableRow key={c.id}>
                    <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                    <CTableDataCell>
                      <div className="small fw-semibold">{c.raisedByUser?.name}</div>
                      <div className="small text-muted">{c.raisedByUser?.email}</div>
                    </CTableDataCell>
                    <CTableDataCell className="small">{c.trip?.title || '-'}</CTableDataCell>
                    <CTableDataCell
                      className="small"
                      style={{
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.reason}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={PRIORITY_COLOR[c.priority] || 'secondary'}>
                        {c.priority}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={STATUS_COLOR[c.status] || 'secondary'}>
                        {STATUS_LABEL[c.status] || c.status?.replace('_', ' ')}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="small text-center">
                      {c._count?.statusLog || 0}
                    </CTableDataCell>
                    <CTableDataCell className="small text-muted">
                      {fmtDate(c.createdAt)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        size="sm"
                        color="outline-primary"
                        title="View case"
                        onClick={() => navigate(`/cases/${c.id}`)}
                      >
                        <CIcon icon={cilZoomIn} size="sm" />
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
              onPageChange={(p) => setFilters({ page: p })}
              onPageSizeChange={(s) => {
                setFilters({ pageSize: s, page: 1 })
              }}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default CaseList
