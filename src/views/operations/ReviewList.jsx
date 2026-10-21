import React, { useState } from 'react'
import { useSearchParamsState } from '../../hooks/useSearchParamState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert, CFormSelect,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  COffcanvas, COffcanvasHeader, COffcanvasTitle, COffcanvasBody,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilStar, cilCheckCircle, cilBan, cilX } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

// Which of the 4 polymorphic subjects a review is actually about — only one
// of trip/destination/reviewedUser/serviceDetails is ever set per review.
const SUBJECT_TAG = {
  TRIP: { label: '#Trip', color: 'info' },
  USER: { label: '#User', color: 'secondary' },
  DESTINATION: { label: '#Destination', color: 'success' },
  SERVICE: { label: '#Service', color: 'warning' },
}

const getSubjectType = (r) =>
  r.trip ? 'TRIP' : r.destination ? 'DESTINATION' : r.reviewedUser ? 'USER' : r.serviceDetails ? 'SERVICE' : null

const getSubjectLabel = (r) => {
  if (r.trip) {
    return r.trip.createdByUser ? `${r.trip.title} — curated by ${r.trip.createdByUser.name}` : r.trip.title
  }
  if (r.destination) return r.destination.name
  if (r.reviewedUser) return r.reviewedUser.name
  if (r.serviceDetails) {
    return `${r.serviceDetails.title} (${r.serviceDetails.serviceType})${r.serviceDetails.serviceProviderUser ? ` — ${r.serviceDetails.serviceProviderUser.name}` : ''}`
  }
  return '-'
}

// Full review detail — opened from the Subject or Photo cell only (not the
// whole row, since the row also has its own Visibility button).
const ReviewDetailPanel = ({ review, onClose }) => {
  if (!review) return null
  const subjectType = getSubjectType(review)
  const tag = subjectType ? SUBJECT_TAG[subjectType] : null

  return (
    <COffcanvas placement="end" visible={!!review} onHide={onClose} scroll backdrop={false} style={{ width: 480 }}>
      <COffcanvasHeader style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
        <COffcanvasTitle className="small fw-semibold">Review Details</COffcanvasTitle>
        <CButton color="link" className="p-0 ms-auto" onClick={onClose}>
          <CIcon icon={cilX} size="sm" />
        </CButton>
      </COffcanvasHeader>
      <COffcanvasBody>
        <div className="d-flex align-items-center gap-2 mb-3">
          {tag && <CBadge color={tag.color}>{tag.label}</CBadge>}
          <span className="small fw-semibold">{getSubjectLabel(review)}</span>
        </div>

        <div className="mb-3">
          <div className="text-muted small fw-semibold text-uppercase mb-1">Reviewer</div>
          <div className="small fw-semibold">{review.reviewer?.name}</div>
          <div className="small text-muted">{review.reviewer?.email}</div>
        </div>

        <div className="mb-3">
          <CBadge color="warning" textColor="dark">
            <CIcon icon={cilStar} size="sm" className="me-1" />{review.rating} / 5
          </CBadge>
        </div>

        <div className="mb-3">
          <div className="text-muted small fw-semibold text-uppercase mb-1">Comment</div>
          <p className="small mb-0">{review.comment || '-'}</p>
        </div>

        {review.mediaUrls?.length > 0 && (
          <div className="mb-3">
            <div className="text-muted small fw-semibold text-uppercase mb-2">
              Photos ({review.mediaUrls.length})
            </div>
            <div className="d-flex flex-wrap gap-2">
              {review.mediaUrls.map((m) => (
                <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                  <img
                    src={m.url}
                    alt=""
                    style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8 }}
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mb-3">
          <div className="text-muted small fw-semibold text-uppercase mb-1">Flags</div>
          <div className="d-flex gap-1 flex-wrap">
            {review.isVerified && <CBadge color="success">Verified</CBadge>}
            {review.isDeleted && <CBadge color="danger">Deleted</CBadge>}
            {!review.isPublic && <CBadge color="secondary">Hidden</CBadge>}
            {!review.isVerified && !review.isDeleted && review.isPublic && (
              <span className="small text-muted">None</span>
            )}
          </div>
        </div>

        <div className="small text-muted">
          Submitted {fmtDateTime(review.createdAt)}
        </div>
      </COffcanvasBody>
    </COffcanvas>
  )
}

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
  const [detailReview, setDetailReview] = useState(null)

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
    <ReviewDetailPanel review={detailReview} onClose={() => setDetailReview(null)} />
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
        <CButton size="sm" color="warning" onClick={confirmVisibility} disabled={updateMut.isPending}>
          {updateMut.isPending ? <CSpinner size="sm" /> : 'Yes, change it'}
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
                  <CTableHeaderCell style={{ width: 56 }}>Photo</CTableHeaderCell>
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
                    <CTableDataCell
                      className="small"
                      role="button"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setDetailReview(r)}
                      title="View full review"
                    >
                      {(() => {
                        const subjectType = getSubjectType(r)
                        const tag = subjectType ? SUBJECT_TAG[subjectType] : null
                        return (
                          <div>
                            <div className="mb-1">
                              {tag && <CBadge color={tag.color}>{tag.label}</CBadge>}
                            </div>
                            <div className="text-truncate" style={{ maxWidth: 220 }}>
                              {getSubjectLabel(r)}
                            </div>
                          </div>
                        )
                      })()}
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
                    <CTableDataCell
                      role="button"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setDetailReview(r)}
                      title="View full review"
                    >
                      {r.thumbUrl ? (
                        <div style={{ position: 'relative', width: 40, height: 40 }}>
                          <img
                            src={r.thumbUrl}
                            alt=""
                            style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }}
                          />
                          {r.mediaUrls?.length > 1 && (
                            <CBadge
                              color="dark"
                              shape="rounded-pill"
                              style={{ position: 'absolute', bottom: -4, right: -4, fontSize: 9 }}
                            >
                              +{r.mediaUrls.length - 1}
                            </CBadge>
                          )}
                        </div>
                      ) : (
                        <div
                          className="text-muted small d-flex align-items-center justify-content-center"
                          style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--cui-tertiary-bg)' }}
                        >
                          -
                        </div>
                      )}
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
                        disabled={updateMut.isPending}
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
