import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchParamsState } from '../../hooks/useSearchParamState'
import { useQuery } from '@tanstack/react-query'
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
  CFormInput,
  CFormSelect,
  CBadge,
  CButton,
  CSpinner,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilZoomIn } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const statusColor = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  BANNED: 'danger',
  DEACTIVATED: 'secondary',
}

const roleLabel = {
  PHOTOGRAPHER: 'Photographer',
  SERVICE_PROVIDER: 'SP',
  TRIP_MANAGER: 'Trip Manager',
  ADMIN: 'Admin',
}

const fetchUsers = async ({ limit, offset, search, role, accountStatus, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (search) params.set('search', search)
  if (role) params.set('role', role)
  if (accountStatus) params.set('accountStatus', accountStatus)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/users?${params}`)
  return res.data.data
}

const initials = (name) =>
  (name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

const UserList = () => {
  const navigate = useNavigate()
  const { admin } = useAuth()
  const [filters, setFilters] = useSearchParamsState({
    page: { default: 1, type: 'number' },
    pageSize: { default: 20, type: 'number' },
    search: { default: '' },
    role: { default: '' },
    accountStatus: { default: '' },
    sortBy: { default: 'createdAt' },
    sortOrder: { default: 'desc' },
  })
  const { page, pageSize, search, role, accountStatus, sortBy, sortOrder } = filters
  // Typing buffer only — not URL-synced itself, it initializes from the
  // already-persisted `search` value below so it's still correct on
  // remount, without needing to sync every keystroke to the URL.
  const [searchInput, setSearchInput] = useState(search)

  const offset = (page - 1) * pageSize

  const handleSort = (field, order) => {
    setFilters({ sortBy: field, sortOrder: order, page: 1 })
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users', { page, pageSize, search, role, accountStatus, sortBy, sortOrder }],
    queryFn: () => fetchUsers({ limit: pageSize, offset, search, role, accountStatus, sortBy, sortOrder }),
    placeholderData: (prev) => prev,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    setFilters({ search: searchInput, page: 1 })
  }

  return (
    <CCard>
      <CCardHeader>
        <strong>Users</strong>

      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3 g-2">
          <CCol md={5}>
            <form onSubmit={handleSearch} className="d-flex gap-2">
              <CFormInput
                placeholder="Search name, email, phone."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                size="sm"
              />
              <CButton type="submit" color="primary" size="sm">Search</CButton>
            </form>
          </CCol>
          <CCol md={3}>
            <CFormSelect
              size="sm"
              value={role}
              onChange={(e) => setFilters({ role: e.target.value, page: 1 })}
            >
              <option value="">All roles</option>
              <option value="PHOTOGRAPHER">Photographer</option>
              <option value="SERVICE_PROVIDER">Service Provider</option>
              <option value="TRIP_MANAGER">Trip Manager</option>
            </CFormSelect>
          </CCol>
          <CCol md={3}>
            <CFormSelect
              size="sm"
              value={accountStatus}
              onChange={(e) => setFilters({ accountStatus: e.target.value, page: 1 })}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
              <option value="DEACTIVATED">Deactivated</option>
            </CFormSelect>
          </CCol>
        </CRow>

        {isLoading && (
          <div className="text-center py-5"><CSpinner color="primary" /></div>
        )}
        {isError && <CAlert color="danger">Failed to load users.</CAlert>}

        {data && (
          <>
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <SortableHeader field="name"           label="User"        sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader field="role"           label="Role"        sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader field="accountStatus"  label="Status"      sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>SP Verified</CTableHeaderCell>
                  <SortableHeader field="createdTrips"   label="Trips"       sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader field="receivedReviews" label="Reviews"    sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader field="createdAt"      label="Joined"      sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.users.filter((u) => u.id !== admin?.id).map((u, idx) => (
                  <CTableRow key={u.id}>
                    <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex align-items-center gap-2">
                        {u.profilePhotoUrl ? (
                          <img
                            src={u.profilePhotoUrl}
                            alt=""
                            style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 30, height: 30, borderRadius: '50%',
                              background: '#321fdb', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, flexShrink: 0,
                            }}
                          >
                            {initials(u.name)}
                          </div>
                        )}
                        <div>
                          <div className="fw-semibold small">{u.name}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{u.email || u.phone}</div>
                        </div>
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="light" textColor="dark" shape="rounded-pill">
                        {roleLabel[u.role] || u.role}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={statusColor[u.accountStatus] || 'secondary'} shape="rounded-pill">
                        {u.accountStatus}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      {u.role === 'SERVICE_PROVIDER' ? (
                        <CBadge color={u.serviceProvider?.verified ? 'success' : 'warning'}>
                          {u.serviceProvider?.profileStatus || '—'}
                        </CBadge>
                      ) : '—'}
                    </CTableDataCell>
                    <CTableDataCell>{u._count?.createdTrips ?? 0}</CTableDataCell>
                    <CTableDataCell>{u._count?.receivedReviews ?? 0}</CTableDataCell>
                    <CTableDataCell className="small text-muted">
                      {fmtDate(u.createdAt)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton size="sm" color="outline-primary" title="View details" onClick={() => navigate(`/users/${u.id}`)}>
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
              onPageSizeChange={(s) => setFilters({ pageSize: s, page: 1 })}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default UserList
