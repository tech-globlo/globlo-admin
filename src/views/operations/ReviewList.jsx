import React, { useState } from 'react'
import { useSearchParamsState } from '../../hooks/useSearchParamState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert, CFormSelect,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilStar, cilCheckCircle, cilBan } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDate } from '../../lib/dateUtils'

const fetchReviews = async ({ limit, offset, isDeleted, isVerified, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (isDeleted !== '') params.set('isDeleted', isDeleted)
  if (isVerified !== '') params.set('isVerified', isVerified)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/reviews?${params}`)
  return res.data.data
}

const ReviewList = () => {
  const qc = useQueryClient()
  const [filters, setFilters] = useSearchParamsState({
    page: { default: 1, type: 'number' },
    pageSize: { default: 20, type: 'number' },
    isDeleted: { default: '' },
    isVerified: { default: '' },
    sortBy: { default: 'createdAt' },
    sortOrder: { default: 'desc' },
  })
  const { page, pageSize, isDeleted, isVerified, sortBy, sortOrder } = filters
  const offset = (page - 1) * pageSize

  const handleSort = (field, order) => { setFilters({ sortBy: field, sortOrder: order, page: 1 }) }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-reviews', { page, pageSize, isDeleted, isVerified, sortBy, sortOrder }],
    queryFn: () => fetchReviews({ limit: pageSize, offset, isDeleted, isVerified, sortBy, sortOrder }),
    placeholderData: (prev) => prev,
  })

  const [visibilityConfirm, setVisibilityConfirm] = useState(null) // { id, currentValue }

  const updateMut = useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/api/admin/reviews/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reviews'] }),
  })

  const confirmVisibility = () => {
    updateMut.mutate(
      { id: visibilityConfirm.id, patch: { isPublic: !visibilityConfirm.currentValue } },
      { onSettled: () => setVisibilityConfirm(null) },
    )
  }

  return (
    <>
    <CModal size="sm" visible={!!visibilityConfirm} onClose={() => setVisibilityConfirm(null)} alignment="center">
      <CModalHeader>
        <CModalTitle>Change Visibility?</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="small mb-0">
          {visibilityConfirm?.currentValue
            ? 'This will hide the review from public. Are you sure?'
            : 'This will make the review visible to the public. Are you sure?'}
        </p>
      </CModalBody>
      <CModalFooter>
        <CButton size="sm" color="secondary" onClick={() => setVisibilityConfirm(null)}>
          Cancel
        </CButton>
        <CButton size="sm" color="warning" onClick={confirmVisibility} disabled={updateMut.isLoading}>
          {updateMut.isLoading ? <CSpinner size="sm" /> : 'Yes, change it'}
        </CButton>
      </CModalFooter>
    </CModal>
    <CCard>
      <CCardHeader>
        <strong>Reviews</strong>

      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3 g-2">
          <CCol md={3}>
            <CFormSelect size="sm" value={isDeleted} onChange={(e) => setFilters({ isDeleted: e.target.value, page: 1 })}>
              <option value="">All</option>
              <option value="false">Active only</option>
              <option value="true">Deleted only</option>
            </CFormSelect>
          </CCol>
          <CCol md={3}>
            <CFormSelect size="sm" value={isVerified} onChange={(e) => setFilters({ isVerified: e.target.value, page: 1 })}>
              <option value="">Verification: all</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </CFormSelect>
          </CCol>
        </CRow>

        {isLoading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
        {isError && <CAlert color="danger">Failed to load reviews.</CAlert>}

        {data && (
          <>
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <CTableHeaderCell>Reviewer</CTableHeaderCell>
                  <CTableHeaderCell>Subject</CTableHeaderCell>
                  <SortableHeader field="rating" label="Rating" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>Comment</CTableHeaderCell>
                  <CTableHeaderCell>Flags</CTableHeaderCell>
                  <SortableHeader field="createdAt" label="Date" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>Visibility</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.reviews.map((r, idx) => (
                  <CTableRow key={r.id} style={{ opacity: r.isDeleted ? 0.5 : 1 }}>
                    <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                    <CTableDataCell>
                      <div className="small fw-semibold">{r.reviewer?.name}</div>
                      <div className="small text-muted">{r.reviewer?.email}</div>
                    </CTableDataCell>
                    <CTableDataCell className="small">
                      {r.trip?.title || r.destination?.name || r.reviewedUser?.name || '-'}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="warning" textColor="dark">
                        <CIcon icon={cilStar} size="sm" className="me-1" />{r.rating} / 5
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell
                      className="small"
                      style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {r.comment || '-'}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex gap-1 flex-wrap">
                        {r.isVerified && <CBadge color="success">Verified</CBadge>}
                        {r.isDeleted && <CBadge color="danger">Deleted</CBadge>}
                        {!r.isPublic && <CBadge color="secondary">Hidden</CBadge>}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell className="small text-muted">{fmtDate(r.createdAt)}</CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        size="sm"
                        color={r.isPublic ? 'success' : 'outline-secondary'}
                        title={r.isPublic ? 'Make private' : 'Make public'}
                        onClick={() => setVisibilityConfirm({ id: r.id, currentValue: r.isPublic })}
                        disabled={updateMut.isLoading}
                      >
                        <CIcon icon={r.isPublic ? cilCheckCircle : cilBan} size="sm" />
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
    </>
  )
}

export default ReviewList
