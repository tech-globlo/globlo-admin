import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CFormInput, CFormSelect, CFormTextarea,
  CButton, CSpinner, CAlert,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPlus, cilPencil, cilTrash } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const fetchHotspots = async ({ limit, offset, search, destinationId, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (search) params.set('search', search)
  if (destinationId) params.set('destinationId', destinationId)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/hotspots?${params}`)
  return res.data.data
}

const fetchDestinations = async () => {
  const res = await api.get('/api/admin/destinations?limit=200&offset=0')
  return res.data.data?.destinations || []
}

const EMPTY_FORM = { name: '', destinationId: '', latitude: '', longitude: '', description: '' }

const HotspotList = () => {
  const qc = useQueryClient()
  const [success, setSuccess] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filterDest, setFilterDest] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)   // null = add, object = edit
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)

  const offset = (page - 1) * pageSize

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-hotspots', page, pageSize, search, filterDest, sortBy, sortOrder],
    queryFn: () => fetchHotspots({ limit: pageSize, offset, search, destinationId: filterDest, sortBy, sortOrder }),
    placeholderData: (prev) => prev,
  })

  const { data: destinations = [] } = useQuery({
    queryKey: ['admin-destinations-list'],
    queryFn: fetchDestinations,
    staleTime: 60000,
  })

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder((o) => o === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortOrder('asc') }
    setPage(1)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const saveMut = useMutation({
    mutationFn: (payload) => editing
      ? api.patch(`/api/admin/hotspots/${editing.id}`, payload)
      : api.post('/api/admin/hotspots', payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-hotspots'] })
      qc.invalidateQueries({ queryKey: ['admin-destination'] })
      const msg = editing ? 'Hotspot updated successfully.' : 'Hotspot added successfully.'
      closeModal()
      setSuccess(msg)
      setTimeout(() => setSuccess(''), 4000)
    },
    onError: (err) => setFormError(err.response?.data?.message || 'Save failed.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/hotspots/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-hotspots'] })
      qc.invalidateQueries({ queryKey: ['admin-destination'] })
    },
  })

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModal(true)
  }

  const openEdit = (h) => {
    setEditing(h)
    setForm({
      name: h.name,
      destinationId: h.destinationId,
      latitude: h.latitude,
      longitude: h.longitude,
      description: h.description || '',
    })
    setFormError(null)
    setModal(true)
  }

  const closeModal = () => { setModal(false); setEditing(null); setFormError(null) }

  const handleSave = () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    if (!form.destinationId) { setFormError('Destination is required.'); return }
    if (form.latitude === '' || form.longitude === '') { setFormError('Latitude and Longitude are required.'); return }
    const payload = {
      name: form.name,
      destinationId: form.destinationId,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      description: form.description || undefined,
    }
    if (editing) delete payload.destinationId   // destinationId not updatable
    saveMut.mutate(payload)
  }

  const setF = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Hotspots</strong>
          <CButton size="sm" color="primary" onClick={openAdd}>
            <CIcon icon={cilPlus} className="me-1" size="sm" />Add Hotspot
          </CButton>
        </CCardHeader>
        <CCardBody>
          {/* Filters */}
          <CRow className="mb-3 g-2">
            <CCol md={4}>
              <form onSubmit={handleSearch} className="d-flex gap-2">
                <CFormInput
                  size="sm"
                  placeholder="Search name or destination."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <CButton type="submit" color="primary" size="sm">
                  <CIcon icon={cilSearch} size="sm" />
                </CButton>
              </form>
            </CCol>
            <CCol md={4}>
              <CFormSelect
                size="sm"
                value={filterDest}
                onChange={(e) => { setFilterDest(e.target.value); setPage(1) }}
              >
                <option value="">All Destinations</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} - {d.country}</option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>

          {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}
          {isLoading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
          {isError && <CAlert color="danger">Failed to load hotspots.</CAlert>}

          {data && (
            <>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                    <SortableHeader field="name" label="Name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <SortableHeader field="destinationName" label="Destination" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <CTableHeaderCell>Coordinates</CTableHeaderCell>
                    <CTableHeaderCell>Description</CTableHeaderCell>
                    <SortableHeader field="createdAt" label="Added" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <CTableHeaderCell style={{ width: 100 }}>Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {data.hotspots.map((h, idx) => (
                    <CTableRow key={h.id}>
                      <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                      <CTableDataCell className="small fw-semibold">{h.name}</CTableDataCell>
                      <CTableDataCell className="small">
                        {h.destination?.name && (
                          <>
                            <div>{h.destination.name}</div>
                            <div className="text-muted">{h.destination.country}</div>
                          </>
                        )}
                      </CTableDataCell>
                      <CTableDataCell className="small text-muted">
                        {h.latitude}, {h.longitude}
                      </CTableDataCell>
                      <CTableDataCell className="small text-muted" style={{ maxWidth: 240 }}>
                        <span className="text-truncate d-inline-block" style={{ maxWidth: 220 }}>
                          {h.description || '-'}
                        </span>
                      </CTableDataCell>
                      <CTableDataCell className="small text-muted">
                        {fmtDate(h.createdAt)}
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex gap-1">
                          <CButton size="sm" color="outline-primary" onClick={() => openEdit(h)}>
                            <CIcon icon={cilPencil} size="sm" />
                          </CButton>
                          <CButton
                            size="sm"
                            color="outline-danger"
                            onClick={() => window.confirm(`Delete hotspot "${h.name}"?`) && deleteMut.mutate(h.id)}
                          >
                            <CIcon icon={cilTrash} size="sm" />
                          </CButton>
                        </div>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {data.hotspots.length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center text-muted py-4 small">
                        No hotspots found.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>

              <AdminTableFooter
                total={data.total}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
              />
            </>
          )}
        </CCardBody>
      </CCard>

      {/* ── Add / Edit Modal ────────────────────────────────────────────── */}
      <CModal visible={modal} onClose={closeModal}>
        <CModalHeader>
          <CModalTitle>{editing ? 'Edit Hotspot' : 'Add Hotspot'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {formError && <CAlert color="danger" className="py-2 small mb-3">{formError}</CAlert>}

          <div className="mb-3">
            <label className="form-label small fw-semibold">Destination <span className="text-danger">*</span></label>
            <CFormSelect
              size="sm"
              value={form.destinationId}
              onChange={(e) => setF('destinationId', e.target.value)}
              disabled={!!editing}
            >
              <option value="">- Select destination -</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>{d.name} - {d.country}</option>
              ))}
            </CFormSelect>
            {editing && <div className="small text-muted mt-1">Destination cannot be changed after creation.</div>}
          </div>

          <div className="mb-3">
            <label className="form-label small fw-semibold">Name <span className="text-danger">*</span></label>
            <CFormInput
              size="sm"
              value={form.name}
              onChange={(e) => setF('name', e.target.value)}
              placeholder="e.g. Tiger Reserve Zone A"
              autoFocus
            />
          </div>

          <CRow className="mb-3">
            <CCol>
              <label className="form-label small fw-semibold">Latitude <span className="text-danger">*</span></label>
              <CFormInput
                size="sm"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setF('latitude', e.target.value)}
                placeholder="e.g. 22.5937"
              />
            </CCol>
            <CCol>
              <label className="form-label small fw-semibold">Longitude <span className="text-danger">*</span></label>
              <CFormInput
                size="sm"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setF('longitude', e.target.value)}
                placeholder="e.g. 78.9629"
              />
            </CCol>
          </CRow>

          <div>
            <label className="form-label small fw-semibold">Description</label>
            <CFormTextarea
              rows={2}
              value={form.description}
              onChange={(e) => setF('description', e.target.value)}
              placeholder="What makes this spot special."
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeModal}>Cancel</CButton>
          <CButton color="primary" onClick={handleSave} disabled={saveMut.isPending}>
            {saveMut.isPending ? <CSpinner size="sm" className="me-1" /> : null}
            {editing ? 'Update' : 'Add'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default HotspotList
