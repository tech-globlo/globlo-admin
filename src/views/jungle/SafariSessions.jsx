﻿import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
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
  CFormSelect,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import EntityPicker from '../../components/EntityPicker'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const STATUS_COLOR = { ACTIVE: 'success', ENDED: 'secondary', ABANDONED: 'warning' }

const fetchSessions = async ({ limit, offset, status, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (status) params.set('status', status)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/safari-sessions?${params}`)
  return res.data.data
}

const EMPTY_SESSION_FORM = { startedByUser: null, destination: null, trip: null, zone: '', notes: '' }

const SafariSessions = () => {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [status, setStatus] = useState('')
  const [sortBy, setSortBy] = useState('startTime')
  const [sortOrder, setSortOrder] = useState('desc')
  const offset = (page - 1) * pageSize

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_SESSION_FORM)
  const [mutError, setMutError] = useState('')
  const f = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const handleSort = (field, order) => {
    setSortBy(field)
    setSortOrder(order)
    setPage(1)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-safari-sessions', { page, pageSize, status, sortBy, sortOrder }],
    queryFn: () => fetchSessions({ limit: pageSize, offset, status, sortBy, sortOrder }),
    placeholderData: (prev) => prev,
  })

  const openCreate = () => { setForm(EMPTY_SESSION_FORM); setMutError(''); setModal(true) }

  const createMut = useMutation({
    mutationFn: (payload) => api.post('/api/admin/safari-sessions', payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-safari-sessions'] })
      setModal(false)
    },
    onError: (err) => setMutError(err?.response?.data?.message || 'Failed to create safari session.'),
  })

  const canSave = !!form.startedByUser && !!form.destination

  const handleSave = () => {
    createMut.mutate({
      startedByUserId: form.startedByUser.id,
      destinationId: form.destination.id,
      tripId: form.trip?.id || undefined,
      zone: form.zone.trim() || undefined,
      notes: form.notes.trim() || undefined,
    })
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <strong>Safari Sessions</strong>
        <CButton size="sm" color="primary" onClick={openCreate}>+ Add Session</CButton>
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3 g-2">
          <CCol md={3}>
            <CFormSelect
              size="sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ENDED">Ended</option>
              <option value="ABANDONED">Abandoned</option>
            </CFormSelect>
          </CCol>
        </CRow>

        {isLoading && (
          <div className="text-center py-4">
            <CSpinner color="primary" />
          </div>
        )}
        {isError && <CAlert color="danger">Failed to load safari sessions.</CAlert>}

        {data && (
          <>
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <CTableHeaderCell>Started By</CTableHeaderCell>
                  <CTableHeaderCell>Destination</CTableHeaderCell>
                  <CTableHeaderCell>Trip</CTableHeaderCell>
                  <CTableHeaderCell>Zone</CTableHeaderCell>
                  <SortableHeader
                    field="status"
                    label="Status"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <CTableHeaderCell>Participants</CTableHeaderCell>
                  <CTableHeaderCell>Sightings</CTableHeaderCell>
                  <SortableHeader
                    field="startTime"
                    label="Start Time"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <CTableHeaderCell>Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.sessions.map((s, idx) => (
                  <CTableRow key={s.id}>
                    <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                    <CTableDataCell>
                      <div className="small fw-semibold">{s.startedByUser?.name}</div>
                      <div className="small text-muted">{s.startedByUser?.email}</div>
                    </CTableDataCell>
                    <CTableDataCell className="small">{s.destination?.name || '-'}</CTableDataCell>
                    <CTableDataCell className="small">{s.trip?.title || '-'}</CTableDataCell>
                    <CTableDataCell className="small">{s.zone || '-'}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={STATUS_COLOR[s.status] || 'secondary'}>{s.status}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="small text-center">
                      {s.participants?.length || 0}
                    </CTableDataCell>
                    <CTableDataCell className="small text-center">
                      {s._count?.sightings || 0}
                    </CTableDataCell>
                    <CTableDataCell className="small text-muted">
                      {fmtDateTime(s.startTime)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        size="sm"
                        color="outline-primary"
                        title="View session"
                        onClick={() => navigate(`/jungle-mode/${s.id}`)}
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

      <CModal visible={modal} onClose={() => { setModal(false); setMutError('') }}>
        <CModalHeader>
          <CModalTitle>Add Safari Session</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">
            <EntityPicker
              label="User (starts the session)"
              placeholder="Search by name/email/phone..."
              endpoint="/api/admin/users"
              labelKey="name"
              sublabelKey="email"
              value={form.startedByUser}
              onChange={(v) => f('startedByUser', v)}
              required
            />
            <EntityPicker
              label="Destination"
              placeholder="Search destinations..."
              endpoint="/api/admin/destinations"
              labelKey="name"
              sublabelKey="country"
              value={form.destination}
              onChange={(v) => f('destination', v)}
              required
            />
            <EntityPicker
              label="Trip (optional)"
              placeholder="Search trips..."
              endpoint="/api/admin/trips"
              labelKey="title"
              value={form.trip}
              onChange={(v) => f('trip', v)}
            />
            <div>
              <CFormLabel className="small">Zone (optional)</CFormLabel>
              <CFormInput size="sm" value={form.zone} onChange={(e) => f('zone', e.target.value)} placeholder="e.g. Tadoba Core" />
            </div>
            <div>
              <CFormLabel className="small">Notes (optional)</CFormLabel>
              <CFormInput size="sm" value={form.notes} onChange={(e) => f('notes', e.target.value)} />
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter className="flex-column align-items-stretch gap-2">
          {mutError && <CAlert color="danger" className="mb-0 py-2 small">{mutError}</CAlert>}
          <div className="d-flex justify-content-end gap-2">
            <CButton color="secondary" onClick={() => { setModal(false); setMutError('') }}>Cancel</CButton>
            <CButton color="primary" onClick={handleSave} disabled={createMut.isPending || !canSave}>
              {createMut.isPending ? <CSpinner size="sm" /> : 'Create'}
            </CButton>
          </div>
        </CModalFooter>
      </CModal>
    </CCard>
  )
}

export default SafariSessions
