﻿import React from 'react'
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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBan } from '@coreui/icons'
import api from '../../lib/api'

const fetchFeatured = async () => {
  const res = await api.get('/api/admin/trips?featured=true&limit=100&offset=0')
  return res.data.data
}

const CuratedTrips = () => {
  const qc = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-trips-featured'],
    queryFn: fetchFeatured,
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, featured }) => api.patch(`/api/admin/trips/${id}`, { featured }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-trips-featured'] })
      qc.invalidateQueries({ queryKey: ['admin-trips'] })
    },
  })

  return (
    <CCard>
      <CCardHeader>
        <strong>Curated / Featured Trips</strong>
        {data && <span className="ms-2 text-muted small">({data.total} featured)</span>}
      </CCardHeader>
      <CCardBody>
        {isLoading && (
          <div className="text-center py-4">
            <CSpinner color="primary" />
          </div>
        )}
        {isError && <CAlert color="danger">Failed to load curated trips.</CAlert>}
        {data && data.trips.length === 0 && (
          <p className="text-muted small">
            No featured trips yet. Go to Trips and toggle ? to feature a trip.
          </p>
        )}
        {data && data.trips.length > 0 && (
          <CTable hover responsive small>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                <CTableHeaderCell>Title</CTableHeaderCell>
                <CTableHeaderCell>Destination</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell>Curated By</CTableHeaderCell>
                <CTableHeaderCell>Participants</CTableHeaderCell>
                <CTableHeaderCell>Action</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {data.trips.map((t, idx) => (
                <CTableRow key={t.id}>
                  <CTableDataCell className="small text-muted">{idx + 1}</CTableDataCell>
                  <CTableDataCell className="small fw-semibold">{t.title}</CTableDataCell>
                  <CTableDataCell className="small">{t.destination?.name}</CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={t.status === 'ACTIVE' ? 'success' : 'secondary'}>
                      {t.status}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="small">
                    {t.curatedBy?.agencyName || t.createdByUser?.name || '-'}
                  </CTableDataCell>
                  <CTableDataCell className="small">{t._count?.participants ?? 0}</CTableDataCell>
                  <CTableDataCell>
                    <CButton
                      size="sm"
                      color="outline-danger"
                      title="Remove from featured"
                      onClick={() => toggleMut.mutate({ id: t.id, featured: false })}
                      disabled={toggleMut.isPending}
                    >
                      <CIcon icon={cilBan} size="sm" />
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>
    </CCard>
  )
}

export default CuratedTrips
