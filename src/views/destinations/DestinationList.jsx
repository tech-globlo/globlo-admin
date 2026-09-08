import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchParamsState } from '../../hooks/useSearchParamState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert,
  CFormInput, CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilStar, cilBookmark, cilZoomIn } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDate } from '../../lib/dateUtils'

const fetchDestinations = async ({ limit, offset, search, isPopular, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (search) params.set('search', search)
  if (isPopular !== '') params.set('isPopular', isPopular)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/destinations?${params}`)
  return res.data.data
}

const DestinationList = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filters, setFilters] = useSearchParamsState({
    page: { default: 1, type: 'number' },
    pageSize: { default: 20, type: 'number' },
    search: { default: '' },
    popularFilter: { default: '' },
    sortBy: { default: 'createdAt' },
    sortOrder: { default: 'desc' },
  })
  const { page, pageSize, search, popularFilter, sortBy, sortOrder } = filters
  // Typing buffer only — not URL-synced itself, it initializes from the
  // already-persisted `search` value below so it's still correct on
  // remount, without needing to sync every keystroke to the URL.
  const [searchInput, setSearchInput] = useState(search)

  const offset = (page - 1) * pageSize

  const handleSort = (field, order) => { setFilters({ sortBy: field, sortOrder: order, page: 1 }) }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-destinations', { page, pageSize, search, popularFilter, sortBy, sortOrder }],
    queryFn: () => fetchDestinations({ limit: pageSize, offset, search, isPopular: popularFilter, sortBy, sortOrder }),
    placeholderData: (prev) => prev,
  })

  const togglePopular = useMutation({
    mutationFn: ({ id, isPopular }) => api.patch(`/api/admin/destinations/${id}`, { isPopular }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-destinations'] }),
  })

  const handleSearch = (e) => {
    e.preventDefault()
    setFilters({ search: searchInput, page: 1 })
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <strong>Destinations</strong>

        </div>
        <CButton color="primary" size="sm" onClick={() => navigate('/destinations/new')}>
          + New Destination
        </CButton>
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3 g-2">
          <CCol md={5}>
            <form onSubmit={handleSearch} className="d-flex gap-2">
              <CFormInput
                size="sm"
                placeholder="Search name, country, region."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <CButton type="submit" color="primary" size="sm">Search</CButton>
            </form>
          </CCol>
          <CCol md={3}>
            <CFormSelect
              size="sm"
              value={popularFilter}
              onChange={(e) => setFilters({ popularFilter: e.target.value, page: 1 })}
            >
              <option value="">Popular: all</option>
              <option value="true">Popular only</option>
              <option value="false">Not popular</option>
            </CFormSelect>
          </CCol>
        </CRow>

        {isLoading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
        {isError && <CAlert color="danger">Failed to load destinations.</CAlert>}

        {data && (
          <>
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <SortableHeader field="name" label="Name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableHeader field="country" label="Country / Region" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>Tags</CTableHeaderCell>
                  <SortableHeader field="rating" label="Rating" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>Trips</CTableHeaderCell>
                  <CTableHeaderCell>Reviews</CTableHeaderCell>
                  <SortableHeader field="createdAt" label="Created" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>Popular</CTableHeaderCell>
                  <CTableHeaderCell>Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.destinations.map((d, idx) => (
                  <CTableRow key={d.id}>
                    <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                    <CTableDataCell className="small fw-semibold">{d.name}</CTableDataCell>
                    <CTableDataCell className="small">
                      {[d.region, d.country].filter(Boolean).join(' - ')}
                    </CTableDataCell>
                    <CTableDataCell>
                      {(d.tags || []).slice(0, 3).map((t) => (
                        <CBadge key={t} color="light" textColor="dark" className="me-1">{t}</CBadge>
                      ))}
                    </CTableDataCell>
                    <CTableDataCell className="small">
                      {d.rating
                        ? <><CIcon icon={cilStar} size="sm" className="me-1 text-warning" />{d.rating}</>
                        : '-'}
                    </CTableDataCell>
                    <CTableDataCell className="small text-center">{d._count?.trips ?? 0}</CTableDataCell>
                    <CTableDataCell className="small text-center">{d._count?.reviews ?? 0}</CTableDataCell>
                    <CTableDataCell className="small text-muted">{fmtDate(d.createdAt)}</CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        size="sm"
                        color={d.isPopular ? 'warning' : 'outline-secondary'}
                        title={d.isPopular ? 'Mark as not popular' : 'Mark as popular'}
                        onClick={() => togglePopular.mutate({ id: d.id, isPopular: !d.isPopular })}
                        disabled={togglePopular.isLoading}
                      >
                        <CIcon icon={cilBookmark} size="sm" />
                      </CButton>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton size="sm" color="outline-primary" onClick={() => navigate(`/destinations/${d.id}`)}>
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

export default DestinationList
