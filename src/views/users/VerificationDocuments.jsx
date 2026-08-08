import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  CButtonGroup,
  CSpinner,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormTextarea,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilNotes } from '@coreui/icons'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const STATUS_COLOR = {
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'secondary',
}

const humanize = (s) => (s || '').replace(/_/g, ' ').toLowerCase()

const fetchPending = async () => {
  const res = await api.get('/api/admin/verifications/documents')
  return res.data.data
}

const fetchExpiring = async () => {
  const res = await api.get('/api/admin/verifications/documents/expiring', {
    params: { withinDays: 30 },
  })
  return res.data.data
}

const fetchDetails = async (id) => {
  const res = await api.get(`/api/admin/verifications/documents/${id}`)
  return res.data.data
}

const reviewDocument = async ({ id, status, rejectionReason, notes }) => {
  const res = await api.post(`/api/admin/verifications/documents/${id}/verify`, {
    status,
    rejectionReason,
    notes,
  })
  return res.data
}

const InfoRow = ({ label, value }) => (
  <CListGroupItem className="d-flex justify-content-between py-2">
    <span className="text-muted small">{label}</span>
    <span className="small fw-semibold">{value || '-'}</span>
  </CListGroupItem>
)

const VerificationDocuments = () => {
  const qc = useQueryClient()
  const [tab, setTab] = useState('pending') // 'pending' | 'expiring'
  const [selectedId, setSelectedId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [notes, setNotes] = useState('')
  const [mutError, setMutError] = useState(null)

  const {
    data: pending,
    isLoading: pendingLoading,
    isError: pendingError,
  } = useQuery({
    queryKey: ['admin-verification-documents', 'pending'],
    queryFn: fetchPending,
    enabled: tab === 'pending',
  })

  const {
    data: expiring,
    isLoading: expiringLoading,
    isError: expiringError,
  } = useQuery({
    queryKey: ['admin-verification-documents', 'expiring'],
    queryFn: fetchExpiring,
    enabled: tab === 'expiring',
  })

  const { data: selected, isLoading: detailsLoading } = useQuery({
    queryKey: ['admin-verification-document', selectedId],
    queryFn: () => fetchDetails(selectedId),
    enabled: !!selectedId,
  })

  const mutation = useMutation({
    mutationFn: reviewDocument,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-verification-documents'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setSelectedId(null)
      setMutError(null)
    },
    onError: (err) => setMutError(err.response?.data?.message || 'Failed'),
  })

  const openModal = (doc) => {
    setSelectedId(doc.id)
    setRejectionReason('')
    setNotes('')
    setMutError(null)
  }

  const handleDecision = (status) => {
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      setMutError('A rejection reason is required.')
      return
    }
    mutation.mutate({ id: selectedId, status, rejectionReason, notes })
  }

  const data = tab === 'pending' ? pending : expiring
  const isLoading = tab === 'pending' ? pendingLoading : expiringLoading
  const isError = tab === 'pending' ? pendingError : expiringError

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <div>
            <strong>Verification Documents</strong>
            {data && <span className="ms-2 text-muted small">({data.length})</span>}
          </div>
          <CButtonGroup size="sm">
            <CButton
              color={tab === 'pending' ? 'primary' : 'outline-secondary'}
              onClick={() => setTab('pending')}
            >
              Pending Review
            </CButton>
            <CButton
              color={tab === 'expiring' ? 'primary' : 'outline-secondary'}
              onClick={() => setTab('expiring')}
            >
              Expiring Soon (30d)
            </CButton>
          </CButtonGroup>
        </CCardHeader>
        <CCardBody>
          {isLoading && (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          )}
          {isError && <CAlert color="danger">Failed to load documents.</CAlert>}
          {data && data.length === 0 && (
            <p className="text-muted small">
              {tab === 'pending' ? 'No documents pending review.' : 'No documents expiring soon.'}
            </p>
          )}
          {data && data.length > 0 && (
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <CTableHeaderCell>User</CTableHeaderCell>
                  <CTableHeaderCell>Document Type</CTableHeaderCell>
                  <CTableHeaderCell>Listing</CTableHeaderCell>
                  {tab === 'pending' ? (
                    <>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Submitted</CTableHeaderCell>
                    </>
                  ) : (
                    <CTableHeaderCell>Expires</CTableHeaderCell>
                  )}
                  <CTableHeaderCell>Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.map((doc, idx) => (
                  <CTableRow key={doc.id}>
                    <CTableDataCell className="small text-muted">{idx + 1}</CTableDataCell>
                    <CTableDataCell>
                      <div className="small fw-semibold">{doc.user?.name}</div>
                      <div className="small text-muted">{doc.user?.email}</div>
                    </CTableDataCell>
                    <CTableDataCell className="small text-capitalize">
                      {humanize(doc.docType)}
                    </CTableDataCell>
                    <CTableDataCell className="small">
                      {doc.serviceDetails?.title || '—'}
                    </CTableDataCell>
                    {tab === 'pending' ? (
                      <>
                        <CTableDataCell>
                          <CBadge color={STATUS_COLOR[doc.verificationStatus] || 'secondary'}>
                            {doc.verificationStatus}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="small text-muted">
                          {fmtDate(doc.createdAt)}
                        </CTableDataCell>
                      </>
                    ) : (
                      <CTableDataCell className="small text-muted">
                        {fmtDate(doc.expiryDate)}
                      </CTableDataCell>
                    )}
                    <CTableDataCell>
                      <CButton
                        size="sm"
                        color="primary"
                        title="Review"
                        onClick={() => openModal(doc)}
                      >
                        <CIcon icon={cilNotes} size="sm" />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      {/* Review Modal */}
      <CModal visible={!!selectedId} size="lg" onClose={() => setSelectedId(null)}>
        <CModalHeader>
          <CModalTitle>Review Document: {selected?.user?.name}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {detailsLoading && (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          )}
          {mutError && (
            <CAlert color="danger" className="mb-3">
              {mutError}
            </CAlert>
          )}
          {selected && (
            <CRow>
              <CCol md={6}>
                <strong className="small d-block mb-2">Document Details</strong>
                <CListGroup flush>
                  <InfoRow label="Type" value={humanize(selected.docType)} />
                  <InfoRow label="Purposes" value={selected.purposes?.map(humanize).join(', ')} />
                  <InfoRow label="Document No." value={selected.documentNumber} />
                  <InfoRow label="Issuing Authority" value={selected.issuingAuthority} />
                  <InfoRow label="Issued" value={fmtDate(selected.issuedDate)} />
                  <InfoRow label="Expires" value={fmtDate(selected.expiryDate)} />
                  <InfoRow label="Listing" value={selected.serviceDetails?.title} />
                  <InfoRow label="Current Status" value={selected.verificationStatus} />
                  {selected.verifiedByAdmin && (
                    <InfoRow label="Last Reviewed By" value={selected.verifiedByAdmin.name} />
                  )}
                </CListGroup>
              </CCol>
              <CCol md={6}>
                <strong className="small d-block mb-2">Uploaded Files</strong>
                {selected.media?.length > 0 ? (
                  <CListGroup flush>
                    {selected.media.map((m) => (
                      <CListGroupItem key={m.id} className="small py-1">
                        <a href={m.viewUrl} target="_blank" rel="noopener noreferrer">
                          {m.mimeType?.startsWith('image/') ? 'View image' : 'View PDF'}
                        </a>{' '}
                        <span className="text-muted">({m.status})</span>
                      </CListGroupItem>
                    ))}
                  </CListGroup>
                ) : (
                  <p className="small text-muted">No files uploaded yet.</p>
                )}
              </CCol>
            </CRow>
          )}

          <hr />
          <div className="mb-3">
            <label className="form-label small fw-semibold">
              Rejection Reason (required if rejecting)
            </label>
            <CFormTextarea
              rows={2}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label small fw-semibold">Internal Notes</label>
            <CFormTextarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setSelectedId(null)}>
            Cancel
          </CButton>
          <CButton
            color="danger"
            variant="outline"
            onClick={() => handleDecision('REJECTED')}
            disabled={mutation.isLoading}
          >
            Reject
          </CButton>
          <CButton
            color="success"
            onClick={() => handleDecision('VERIFIED')}
            disabled={mutation.isLoading}
          >
            {mutation.isLoading ? <CSpinner size="sm" className="me-1" /> : null}
            Verify
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default VerificationDocuments
