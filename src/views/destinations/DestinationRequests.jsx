﻿import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormTextarea,
  CFormInput,
  CFormCheck,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilNotes } from '@coreui/icons'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const fetchRequests = async () => {
  const res = await api.get('/api/admin/destinations/requests')
  return res.data.data
}

const approveRequest = async ({ id, adminNotes, createCanonical, canonicalData }) => {
  const res = await api.post(`/api/admin/destinations/requests/${id}/approve`, {
    adminNotes,
    createCanonicalDestination: createCanonical,
    canonicalDestinationData: createCanonical ? canonicalData : undefined,
  })
  return res.data
}

const rejectRequest = async ({ id, adminNotes }) => {
  const res = await api.post(`/api/admin/destinations/requests/${id}/reject`, { adminNotes })
  return res.data
}

const InfoRow = ({ label, value }) => (
  <CListGroupItem className="d-flex justify-content-between py-2">
    <span className="text-muted small">{label}</span>
    <span className="small fw-semibold">{value || '-'}</span>
  </CListGroupItem>
)

const DestinationRequests = () => {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const [createCanonical, setCreateCanonical] = useState(false)
  const [canonicalName, setCanonicalName] = useState('')
  const [canonicalCountry, setCanonicalCountry] = useState('')
  const [mutError, setMutError] = useState(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-dest-requests'],
    queryFn: fetchRequests,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-dest-requests'] })
    qc.invalidateQueries({ queryKey: ['admin-stats'] })
    setSelected(null)
    setMutError(null)
  }

  const approveMut = useMutation({
    mutationFn: ({ id }) =>
      approveRequest({
        id,
        adminNotes: notes,
        createCanonical,
        canonicalData: { name: canonicalName, country: canonicalCountry, description: '' },
      }),
    onSuccess: invalidate,
    onError: (err) => setMutError(err.response?.data?.message || 'Failed to approve'),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id }) => rejectRequest({ id, adminNotes: notes }),
    onSuccess: invalidate,
    onError: (err) => setMutError(err.response?.data?.message || 'Failed to reject'),
  })

  const openModal = (req) => {
    setSelected(req)
    setNotes('')
    setCreateCanonical(false)
    setCanonicalName(req.name || '')
    setCanonicalCountry(req.country || '')
    setMutError(null)
  }

  const busy = approveMut.isPending || rejectMut.isPending

  return (
    <>
      <CCard>
        <CCardHeader>
          <strong>Destination Requests</strong>
          {data && <span className="ms-2 text-muted small">({data.length} pending)</span>}
        </CCardHeader>
        <CCardBody>
          {isLoading && (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          )}
          {isError && <CAlert color="danger">Failed to load requests.</CAlert>}
          {data && data.length === 0 && (
            <p className="text-muted small">No pending destination requests.</p>
          )}
          {data && data.length > 0 && (
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <CTableHeaderCell>Destination</CTableHeaderCell>
                  <CTableHeaderCell>Country / Region</CTableHeaderCell>
                  <CTableHeaderCell>Requested By</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.map((req, idx) => (
                  <CTableRow key={req.id}>
                    <CTableDataCell className="small text-muted">{idx + 1}</CTableDataCell>
                    <CTableDataCell className="small fw-semibold">{req.name}</CTableDataCell>
                    <CTableDataCell className="small">
                      {[req.country, req.region].filter(Boolean).join(', ')}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="small">{req.requestedBy?.name}</div>
                      <div className="small text-muted">{req.requestedBy?.role}</div>
                    </CTableDataCell>
                    <CTableDataCell className="small text-muted">
                      {fmtDate(req.createdAt)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        size="sm"
                        color="primary"
                        title="Review"
                        onClick={() => openModal(req)}
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
      <CModal visible={!!selected} onClose={() => setSelected(null)}>
        <CModalHeader>
          <CModalTitle>Review Request: {selected?.name}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {mutError && (
            <CAlert color="danger" className="mb-3">
              {mutError}
            </CAlert>
          )}
          <CListGroup flush className="mb-3">
            <InfoRow label="Name" value={selected?.name} />
            <InfoRow label="Country" value={selected?.country} />
            <InfoRow label="Region" value={selected?.region} />
            <InfoRow label="Description" value={selected?.description} />
            <InfoRow label="Requested by" value={selected?.requestedBy?.name} />
          </CListGroup>

          <div className="mb-3">
            <label className="form-label small fw-semibold">Admin Notes</label>
            <CFormTextarea
              rows={2}
              placeholder="Notes (sent to requester on approve/reject)."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <CFormCheck
            label="Create canonical destination from this request"
            checked={createCanonical}
            onChange={(e) => setCreateCanonical(e.target.checked)}
            className="mb-2"
          />
          {createCanonical && (
            <div className="d-flex gap-2">
              <CFormInput
                size="sm"
                placeholder="Canonical name"
                value={canonicalName}
                onChange={(e) => setCanonicalName(e.target.value)}
              />
              <CFormInput
                size="sm"
                placeholder="Country"
                value={canonicalCountry}
                onChange={(e) => setCanonicalCountry(e.target.value)}
              />
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setSelected(null)}>
            Cancel
          </CButton>
          <CButton
            color="danger"
            onClick={() => rejectMut.mutate({ id: selected.id })}
            disabled={busy || !notes.trim()}
          >
            {rejectMut.isPending ? <CSpinner size="sm" className="me-1" /> : null}
            Reject
          </CButton>
          <CButton
            color="success"
            onClick={() => approveMut.mutate({ id: selected.id })}
            disabled={busy}
          >
            {approveMut.isPending ? <CSpinner size="sm" className="me-1" /> : null}
            Approve
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default DestinationRequests
