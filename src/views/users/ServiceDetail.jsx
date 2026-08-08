import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CBadge,
  CButton,
  CSpinner,
  CAlert,
  CListGroup,
  CListGroupItem,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilStar } from '@coreui/icons'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'
import { formatRupees } from '../../lib/constants'

const DOC_STATUS_COLOR = {
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'secondary',
}
const humanizeDocType = (s) => (s || '').replace(/_/g, ' ').toLowerCase()

const fmtPrice = (minor, unit) => {
  if (minor == null) return '-'
  return formatRupees(minor) + (unit ? ' ' + unit : '')
}

const InfoRow = ({ label, value }) => (
  <CListGroupItem className="d-flex justify-content-between align-items-start py-2 px-0 border-start-0 border-end-0">
    <span className="text-muted small" style={{ minWidth: 130 }}>
      {label}
    </span>
    <span
      className="small fw-semibold text-end"
      style={{ maxWidth: '60%', wordBreak: 'break-word' }}
    >
      {value ?? '-'}
    </span>
  </CListGroupItem>
)

const ServiceDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('info')
  const [lightbox, setLightbox] = useState(null)

  const {
    data: service,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-service', id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/services/${id}`)
      return res.data.data
    },
  })

  if (isLoading)
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  if (isError || !service) return <CAlert color="danger">Failed to load service details.</CAlert>

  // Use the denormalized aggregate rather than recomputing from the fetched reviews array
  const avgRating = service.rating != null ? service.rating.toFixed(1) : null
  const reviewCount = service.reviewCount ?? 0

  const images = service.media?.filter((m) => m.mimeType?.startsWith('image/')) || []
  const allImages = [
    ...images,
    ...(service.mediaUrls || []).map((url) => ({ url, mimeType: 'image/jpeg' })),
  ]

  const verificationDocuments = service.verificationDocuments || []

  const TABS = [
    { key: 'info', label: 'Basic Info' },
    { key: 'gallery', label: `Gallery (${allImages.length})` },
    { key: 'documents', label: `Documents (${verificationDocuments.length})` },
    { key: 'reviews', label: `Reviews (${service._count?.reviews ?? 0})` },
  ]

  return (
    <CCard>
      <CCardHeader className="pb-0">
        <CButton color="link" className="p-0 mb-3 text-muted small" onClick={() => navigate(-1)}>
          <CIcon icon={cilArrowLeft} className="me-1" size="sm" />
          Back
        </CButton>

        <div className="d-flex align-items-start gap-3 mb-3">
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 8,
              flexShrink: 0,
              background: '#321fdb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {allImages[0] ? (
              <img
                src={allImages[0].url || allImages[0]}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            ) : (
              <span style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>
                {service.title?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-grow-1">
            <div className="fw-semibold fs-5 mb-1">{service.title}</div>
            <div className="small text-muted mb-2">{service.serviceProviderUser?.name}</div>
            <div className="d-flex flex-wrap gap-1">
              <CBadge color="primary">{service.serviceType}</CBadge>
              <CBadge color={service.isActive ? 'success' : 'secondary'}>
                {service.isActive ? 'Active' : 'Inactive'}
              </CBadge>
              {avgRating && (
                <CBadge color="warning" textColor="dark">
                  <CIcon icon={cilStar} size="sm" className="me-1" />
                  {avgRating}
                </CBadge>
              )}
            </div>
          </div>
          <div className="text-end">
            <div className="fw-bold fs-5 text-primary">
              {fmtPrice(service.priceMinor, service.priceUnit)}
            </div>
            <div className="small text-muted">{service.priceUnit || ''}</div>
          </div>
        </div>

        <CNav variant="underline-border">
          {TABS.map((t) => (
            <CNavItem key={t.key}>
              <CNavLink
                active={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
                style={{ cursor: 'pointer' }}
              >
                {t.label}
              </CNavLink>
            </CNavItem>
          ))}
        </CNav>
      </CCardHeader>

      <CCardBody>
        <CTabContent>
          {/* Basic Info */}
          <CTabPane visible={activeTab === 'info'}>
            <CRow className="g-3">
              <CCol md={6}>
                <CListGroup flush>
                  <InfoRow label="Title" value={service.title} />
                  <InfoRow label="Service Type" value={service.serviceType} />
                  <InfoRow label="Price" value={fmtPrice(service.priceMinor, service.priceUnit)} />
                  <InfoRow
                    label="Status"
                    value={
                      <CBadge color={service.isActive ? 'success' : 'secondary'}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </CBadge>
                    }
                  />
                  <InfoRow label="Trip Assignments" value={service._count?.tripAssignments ?? 0} />
                  <InfoRow label="Rating" value={avgRating ? `★ ${avgRating}` : null} />
                  <InfoRow label="Reviews" value={reviewCount} />
                  <InfoRow label="Created" value={fmtDate(service.createdAt)} />
                  <InfoRow label="Updated" value={fmtDate(service.updatedAt)} />
                </CListGroup>
              </CCol>
              <CCol md={6}>
                <div className="small fw-semibold text-muted mb-2">Provider</div>
                <CListGroup flush>
                  <InfoRow label="Name" value={service.serviceProviderUser?.name} />
                  <InfoRow label="Email" value={service.serviceProviderUser?.email} />
                  <InfoRow label="Phone" value={service.serviceProviderUser?.phone} />
                  <InfoRow label="Role" value={service.serviceProviderUser?.role} />
                </CListGroup>
              </CCol>
              {service.description && (
                <CCol md={12}>
                  <div className="small fw-semibold text-muted mb-1">Description</div>
                  <div className="small" style={{ whiteSpace: 'pre-wrap' }}>
                    {service.description}
                  </div>
                </CCol>
              )}
              {service.details && Object.keys(service.details).length > 0 && (
                <CCol md={12}>
                  <div className="small fw-semibold text-muted mb-2">Additional Details</div>
                  <CListGroup flush>
                    {Object.entries(service.details).map(([k, v]) => (
                      <InfoRow key={k} label={k} value={String(v)} />
                    ))}
                  </CListGroup>
                </CCol>
              )}
            </CRow>
          </CTabPane>

          {/* Gallery */}
          <CTabPane visible={activeTab === 'gallery'}>
            {allImages.length > 0 ? (
              <div className="d-flex flex-wrap gap-2">
                {allImages.map((img, i) => {
                  const src = img.url || img
                  return (
                    <div
                      key={i}
                      onClick={() => setLightbox(i)}
                      style={{
                        width: 140,
                        height: 140,
                        borderRadius: 8,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: '#eee',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={img.thumbUrl || src}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-muted small">No images uploaded yet.</div>
            )}
          </CTabPane>

          {/* Documents */}
          <CTabPane visible={activeTab === 'documents'}>
            {verificationDocuments.length > 0 ? (
              <div className="d-flex flex-column gap-2">
                {verificationDocuments.map((doc) => (
                  <div key={doc.id} className="p-3 bg-body-secondary rounded">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="small fw-semibold text-capitalize">
                          {humanizeDocType(doc.docType)}
                        </div>
                        <div className="small text-muted">Submitted {fmtDate(doc.createdAt)}</div>
                      </div>
                      <CBadge color={DOC_STATUS_COLOR[doc.verificationStatus] || 'secondary'}>
                        {doc.verificationStatus}
                      </CBadge>
                    </div>
                    {doc.documentNumber && (
                      <div className="small text-muted mb-1">No.: {doc.documentNumber}</div>
                    )}
                    {doc.expiryDate && (
                      <div className="small text-muted mb-1">
                        Expires: {fmtDate(doc.expiryDate)}
                      </div>
                    )}
                    {doc.verificationStatus === 'REJECTED' && doc.rejectionReason && (
                      <div className="small text-danger mb-1">Reason: {doc.rejectionReason}</div>
                    )}
                    {doc.media?.length > 0 && (
                      <div className="d-flex gap-2 mt-2">
                        {doc.media.map((m) => (
                          <a
                            key={m.id}
                            href={m.viewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="small"
                          >
                            {m.mimeType?.startsWith('image/') ? 'View image' : 'View file'}
                          </a>
                        ))}
                      </div>
                    )}
                    {doc.verificationStatus === 'PENDING' && (
                      <CButton
                        size="sm"
                        color="link"
                        className="p-0 mt-2"
                        onClick={() => navigate('/verification/documents')}
                      >
                        Review in Verification Queue
                      </CButton>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted small">
                No compliance documents uploaded for this listing.
              </div>
            )}
          </CTabPane>

          {/* Reviews */}
          <CTabPane visible={activeTab === 'reviews'}>
            {service.reviews?.length > 0 ? (
              <>
                {avgRating && (
                  <div className="mb-3 d-flex align-items-center gap-2">
                    <CIcon
                      icon={cilStar}
                      className="text-warning"
                      style={{ width: 20, height: 20 }}
                    />
                    <span className="fs-4 fw-bold text-warning">{avgRating}</span>
                    <span className="small text-muted">
                      / 5 average from {service._count?.reviews} reviews
                    </span>
                  </div>
                )}
                <div className="d-flex flex-column gap-3">
                  {service.reviews.map((r) => (
                    <div key={r.id} className="p-3 bg-body-secondary rounded">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              background: '#321fdb',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {(r.reviewer?.name || 'A').charAt(0).toUpperCase()}
                          </div>
                          <span className="small fw-semibold">
                            {r.reviewer?.name || 'Anonymous'}
                          </span>
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                          <CBadge color="warning" textColor="dark">
                            <CIcon icon={cilStar} size="sm" className="me-1" />
                            {r.rating} / 5
                          </CBadge>
                          <span className="small text-muted">{fmtDate(r.createdAt)}</span>
                        </div>
                      </div>
                      {r.comment && <p className="small mb-0 mt-1">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted small">No reviews yet.</div>
            )}
          </CTabPane>
        </CTabContent>
      </CCardBody>

      {/* Lightbox */}
      {lightbox !== null && allImages.length > 0 && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out',
          }}
        >
          <img
            src={allImages[lightbox]?.url || allImages[lightbox]}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 24,
              color: '#fff',
              fontSize: 28,
              cursor: 'pointer',
            }}
            onClick={() => setLightbox(null)}
          >
            &times;
          </div>
          {allImages.length > 1 && (
            <>
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  setLightbox((lightbox - 1 + allImages.length) % allImages.length)
                }}
                style={{
                  position: 'absolute',
                  left: 24,
                  color: '#fff',
                  fontSize: 36,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                &#8249;
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  setLightbox((lightbox + 1) % allImages.length)
                }}
                style={{
                  position: 'absolute',
                  right: 24,
                  color: '#fff',
                  fontSize: 36,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                &#8250;
              </div>
            </>
          )}
        </div>
      )}
    </CCard>
  )
}

export default ServiceDetail
