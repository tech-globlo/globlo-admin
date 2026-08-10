import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CCard,
  CCardBody,
  CCardHeader,
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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDate } from '../../lib/dateUtils'

const fetchMethods = async ({ limit, offset, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/payout-methods?${params}`)
  return res.data.data
}

const PayoutMethods = () => {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const offset = (page - 1) * pageSize

  const handleSort = (field, order) => {
    setSortBy(field)
    setSortOrder(order)
    setPage(1)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-payout-methods', { page, pageSize, sortBy, sortOrder }],
    queryFn: () => fetchMethods({ limit: pageSize, offset, sortBy, sortOrder }),
    placeholderData: (prev) => prev,
  })

  return (
    <CCard>
      <CCardHeader>
        <strong>Payout Methods</strong>
        {data && <span className="ms-2 text-muted small">({data.total} methods)</span>}
      </CCardHeader>
      <CCardBody>
        {isLoading && (
          <div className="text-center py-4">
            <CSpinner color="primary" />
          </div>
        )}
        {isError && <CAlert color="danger">Failed to load payout methods.</CAlert>}

        {data && (
          <>
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <CTableHeaderCell>User</CTableHeaderCell>
                  <CTableHeaderCell>Role</CTableHeaderCell>
                  <SortableHeader
                    field="type"
                    label="Type"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <CTableHeaderCell>Label / Account</CTableHeaderCell>
                  <SortableHeader
                    field="verified"
                    label="Verified"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <CTableHeaderCell>Primary</CTableHeaderCell>
                  <SortableHeader
                    field="createdAt"
                    label="Created"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <CTableHeaderCell></CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.methods.map((m, idx) => (
                  <CTableRow key={m.id}>
                    <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                    <CTableDataCell>
                      <div className="small fw-semibold">{m.user?.name}</div>
                      <div className="small text-muted">{m.user?.email}</div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="light" textColor="dark">
                        {m.user?.role}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="small">{m.type}</CTableDataCell>
                    <CTableDataCell className="small text-muted">
                      {m.type === 'UPI' ? m.upiId : (m.label || m.accountNumberMasked || '-')}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={m.verified ? 'success' : 'warning'}>
                        {m.verified ? 'Verified' : 'Unverified'}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={m.primary ? 'info' : 'secondary'}>
                        {m.primary ? 'Yes' : 'No'}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="small text-muted">
                      {fmtDate(m.createdAt)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        size="sm"
                        color="outline-primary"
                        onClick={() => navigate(`/payouts/methods/${m.id}`)}
                      >
                        <CIcon icon={cilSearch} size="sm" />
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
              onPageSizeChange={(s) => {
                setPageSize(s)
                setPage(1)
              }}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default PayoutMethods
