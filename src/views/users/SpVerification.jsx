﻿import React, { useState } from 'react'
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
  CSpinner,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormSelect,
  CFormTextarea,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilNotes } from '@coreui/icons'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const STATUS_COLOR = {
  PENDING_REVIEW: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  NEEDS_MORE_INFO: 'info',
}

const fetchPending = async () => {
  const res = await api.get('/api/admin/verifications/service-providers')
  return res.data.data
}

const verifyProvider = async ({ id, status, adminNotes, verificationNotes }) => {
  const res = await api.post(`/api/admin/verifications/service-providers/${id}/verify`, {
    status,
    adminNotes,
    verificationNotes,
  })
  return res.data
}

const InfoRow = ({ label, value }) => (
  <CListGroupItem className="d-flex justify-content-between py-2">
    <span className="text-muted small">{label}</span>
    <span className="small fw-semibold">{value || '-'}</span>
  </CListGroupItem>
)

const SpVerification = () => {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [decision, setDecision] = useState('')
  const [notes, setNotes] = useState('')
  const [verNotes, setVerNotes] = useState('')
  const [mutError, setMutError] = useState(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-sp-verifications'],
    queryFn: fetchPending,
  })

  const mutation = useMutation({
    mutationFn: ({ id, status, adminNotes, verificationNotes }) =>
      verifyProvider({ id, status, adminNotes, verificationNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sp-verifications'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setSelected(null)
      setMutError(null)
    },
    onError: (err) => setMutError(err.response?.data?.message || 'Failed'),
  })

  const handleSubmit = () => {
    if (!decision) {
      setMutError('Select a decision')
      return
    }
    mutation.mutate({
      id: selected.id,
      status: decision,
      adminNotes: notes,
      verificationNotes: verNotes,
    })
  }

  const openModal = (sp) => {
    setSelected(sp)
    setDecision('')
    setNotes('')
    setVerNotes('')
    setMutError(null)
  }

  return (
    <>
      <CCard>
        <CCardHeader>
          <strong>SP Verification Queue</strong>
          {data && <span className="ms-2 text-muted small">({data.length} pending)</span>}
        </CCardHeader>
        <CCardBody>
          {isLoading && (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          )}
          {isError && <CAlert color="danger">Failed to load verifications.</CAlert>}
          {data && data.length === 0 && (
            <p className="text-muted small">No pending verifications.</p>
          )}
          {data && data.length > 0 && (
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <CTableHeaderCell>Provider</CTableHeaderCell>
                  <CTableHeaderCell>Business</CTableHeaderCell>
                  <CTableHeaderCell>Type</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Updated</CTableHeaderCell>
                  <CTableHeaderCell>Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.map((sp, idx) => (
                  <CTableRow key={sp.id}>
                    <CTableDataCell className="small text-muted">{idx + 1}</CTableDataCell>
                    <CTableDataCell>
                      <div className="small fw-semibold">{sp.user?.name}</div>
                      <div className="small text-muted">{sp.user?.email}</div>
                    </CTableDataCell>
                    <CTableDataCell className="small">{sp.businessName || '-'}</CTableDataCell>
                    <CTableDataCell className="small">{sp.type || '-'}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={STATUS_COLOR[sp.profileStatus] || 'secondary'}>
                        {sp.profileStatus}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="small text-muted">
                      {fmtDate(sp.updatedAt)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        size="sm"
                        color="primary"
                        title="Review"
                        onClick={() => openModal(sp)}
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
      <CModal visible={!!selected} size="lg" onClose={() => setSelected(null)}>
        <CModalHeader>
          <CModalTitle>Review: {selected?.user?.name}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {mutError && (
            <CAlert color="danger" className="mb-3">
              {mutError}
            </CAlert>
          )}
          <CRow>
            <CCol md={6}>
              <strong className="small d-block mb-2">Provider Details</strong>
              <CListGroup flush>
                <InfoRow label="Business" value={selected?.businessName} />
                <InfoRow label="Type" value={selected?.type} />
                <InfoRow label="Licensed" value={selected?.licensed ? 'Yes' : 'No'} />
                <InfoRow label="Languages" value={selected?.languagesSpoken?.join(', ')} />
                <InfoRow label="Phone" value={selected?.user?.phone} />
                <InfoRow label="Email" value={selected?.user?.email} />
              </CListGroup>
            </CCol>
            <CCol md={6}>
              <strong className="small d-block mb-2">Destinations</strong>
              {selected?.user?.serviceProviderDestinations?.length > 0 ? (
                <CListGroup flush>
                  {selected.user.serviceProviderDestinations.map((d, i) => (
                    <CListGroupItem key={i} className="small py-1">
                      {d.destination?.name || d.userDefinedDestination?.name || 'Unknown'}
                    </CListGroupItem>
                  ))}
                </CListGroup>
              ) : (
                <p className="small text-muted">No destinations linked.</p>
              )}
            </CCol>
          </CRow>

          <hr />
          <div className="mb-3">
            <label className="form-label small fw-semibold">Decision</label>
            <CFormSelect value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="">Select.</option>
              <option value="VERIFIED">Verified</option>
              <option value="NEEDS_MORE_INFO">Needs More Info</option>
              <option value="REJECTED">Rejected</option>
            </CFormSelect>
          </div>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Admin Notes (internal)</label>
            <CFormTextarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <label className="form-label small fw-semibold">
              Verification Notes (sent to provider)
            </label>
            <CFormTextarea
              rows={2}
              value={verNotes}
              onChange={(e) => setVerNotes(e.target.value)}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setSelected(null)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? <CSpinner size="sm" className="me-1" /> : null}
            Submit Decision
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default SpVerification
