import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert,
  CFormInput, CFormSelect,
} from '@coreui/react'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDateTime } from '../../lib/dateUtils'

const USER_TYPE_LABEL = {
  PHOTOGRAPHER: 'Photographer',
  SERVICE_PROVIDER: 'Service Provider',
  TRIP_MANAGER: 'Trip Manager',
}

const fetchSubscribers = async ({ limit, offset, search, status, userType, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  if (userType) params.set('userType', userType)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/subscribers?${params}`)
  return res.data.data
}

const SubscriberList = () => {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [userTypeFilter, setUserTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  const offset = (page - 1) * pageSize

  const handleSort = (field, order) => { setSortBy(field); setSortOrder(order); setPage(1) }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-subscribers', { page, pageSize, search, statusFilter, userTypeFilter, sortBy, sortOrder }],
    queryFn: () =>
      fetchSubscribers({
        limit: pageSize,
        offset,
        search,
        status: statusFilter,
        userType: userTypeFilter,
        sortBy,
        sortOrder,
      }),
    placeholderData: (prev) => prev,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/api/admin/subscribers/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-subscribers'] }),
  })

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <CCard>
      <CCardHeader>
        <strong>Subscribers</strong>
        <span className="ms-2 text-muted small">
          Onboard requests submitted via the app's pre-signup interest form
        </span>
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3 g-2">
          <CCol md={5}>
            <form onSubmit={handleSearch} className="d-flex gap-2">
              <CFormInput
                size="sm"
                placeholder="Search name, email, phone."
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
              <option value="CONTACTED">Contacted</option>
              <option value="CONVERTED">Converted</option>
              <option value="REJECTED">Rejected</option>
            </CFormSelect>
          </CCol>
          <CCol md={4}>
            <CFormSelect
              size="sm"
              value={userTypeFilter}
              onChange={(e) => { setUserTypeFilter(e.target.value); setPage(1) }}
            >
              <option value="">Role: all</option>
              <option value="PHOTOGRAPHER">Photographer</option>
              <option value="SERVICE_PROVIDER">Service Provider</option>
              <option value="TRIP_MANAGER">Trip Manager</option>
            </CFormSelect>
          </CCol>
        </CRow>

        {isLoading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
        {isError && <CAlert color="danger">Failed to load subscribers.</CAlert>}

        {data && data.subscribers.length === 0 && (
          <p className="text-muted small">No subscriber requests yet.</p>
        )}

        {data && data.subscribers.length > 0 && (
          <>
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <SortableHeader field="name" label="Name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>Contact</CTableHeaderCell>
                  <CTableHeaderCell>Role</CTableHeaderCell>
                  <SortableHeader field="createdAt" label="Submitted" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>Status</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.subscribers.map((s, idx) => (
                  <CTableRow key={s.id}>
                    <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                    <CTableDataCell className="small fw-semibold">{s.name}</CTableDataCell>
                    <CTableDataCell className="small">
                      {s.email && <div>{s.email}</div>}
                      {s.phone && <div className="text-muted">{s.phone}</div>}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="light" textColor="dark" className="border">
                        {USER_TYPE_LABEL[s.userType] || s.userType}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="small text-muted">{fmtDateTime(s.createdAt)}</CTableDataCell>
                    <CTableDataCell>
                      <CFormSelect
                        size="sm"
                        value={s.status}
                        disabled={updateStatus.isLoading}
                        onChange={(e) => updateStatus.mutate({ id: s.id, status: e.target.value })}
                        style={{ width: 140 }}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="CONVERTED">Converted</option>
                        <option value="REJECTED">Rejected</option>
                      </CFormSelect>
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
    </CCard>
  )
}

export default SubscriberList
