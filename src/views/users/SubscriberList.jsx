import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert,
  CFormInput, CFormSelect, CFormCheck,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
} from '@coreui/react'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDateTime } from '../../lib/dateUtils'

const USER_TYPE_LABEL = {
  PHOTOGRAPHER: 'Photographer',
  SERVICE_PROVIDER: 'Service Provider',
  TRIP_MANAGER: 'Trip Manager',
}

const fetchSubscribers = async ({ limit, offset, search, status, userType, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  if (userType) params.set('userType', userType)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/subscribers?${params}`)
  return res.data.data
}

const SubscriberList = () => {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [userTypeFilter, setUserTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedIds, setSelectedIds] = useState([])
  // { id } (single) or { ids } (bulk) while waiting on the admin's yes/no
  const [blockConfirm, setBlockConfirm] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  // Which single row's "Convert" button is in flight — convertOne.isLoading
  // alone can't tell rows apart, so without this every row's button would
  // show a spinner at once.
  const [convertingId, setConvertingId] = useState(null)

  const offset = (page - 1) * pageSize

  const handleSort = (field, order) => { setSortBy(field); setSortOrder(order); setPage(1) }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-subscribers', { page, pageSize, search, statusFilter, userTypeFilter, sortBy, sortOrder }],
    queryFn: () =>
      fetchSubscribers({
        limit: pageSize,
        offset,
        search,
        status: statusFilter,
        userType: userTypeFilter,
        sortBy,
        sortOrder,
      }),
    placeholderData: (prev) => prev,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/api/admin/subscribers/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-subscribers'] }),
  })

  const convertOne = useMutation({
    mutationFn: ({ id, confirmBlock }) => api.post(`/api/admin/subscribers/${id}/convert`, { confirmBlock }),
  })

  const convertBulk = useMutation({
    mutationFn: ({ ids }) => api.post('/api/admin/subscribers/convert-bulk', { ids }),
  })

  const subscribers = data?.subscribers ?? []
  const convertibleIds = subscribers.filter((s) => s.status !== 'CONVERTED').map((s) => s.id)
  const allConvertibleSelected = convertibleIds.length > 0 && convertibleIds.every((id) => selectedIds.includes(id))

  const toggleSelectAll = () => {
    setSelectedIds(allConvertibleSelected ? [] : convertibleIds)
  }
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const refreshList = () => qc.invalidateQueries({ queryKey: ['admin-subscribers'] })

  const handleConvertOne = async (id) => {
    setActionError(null)
    setActionSuccess(null)
    setConvertingId(id)
    try {
      const res = await convertOne.mutateAsync({ id, confirmBlock: false })
      if (res.data.data.requiresConfirmation) {
        setBlockConfirm({ type: 'single', id, existingUserName: res.data.data.existingUserName })
        return
      }
      setActionSuccess('Subscriber converted — login credentials have been sent.')
      refreshList()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to convert subscriber.')
    } finally {
      setConvertingId(null)
    }
  }

  const handleConvertSelected = async () => {
    setActionError(null)
    setActionSuccess(null)
    try {
      const res = await convertBulk.mutateAsync({ ids: selectedIds })
      const outcomes = res.data.data.results
      const converted = outcomes.filter((r) => r.outcome === 'converted')
      const needsConfirm = outcomes.filter((r) => r.outcome === 'requiresConfirmation')
      setSelectedIds([])
      refreshList()
      if (converted.length > 0) {
        setActionSuccess(
          `${converted.length} subscriber${converted.length === 1 ? '' : 's'} converted — login credentials have been sent.`,
        )
      }
      if (needsConfirm.length > 0) {
        setActionError(
          `${needsConfirm.length} of ${outcomes.length} already have an account and were skipped — resolve them individually with "Convert".`,
        )
      }
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to convert selected subscribers.')
    }
  }

  const handleConfirmBlock = async () => {
    if (!blockConfirm) return
    setActionError(null)
    setActionSuccess(null)
    try {
      await convertOne.mutateAsync({ id: blockConfirm.id, confirmBlock: true })
      setActionSuccess('Subscriber marked as blocked.')
      refreshList()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to update subscriber.')
    } finally {
      setBlockConfirm(null)
    }
  }

  return (
    <>
    <CModal visible={!!blockConfirm} onClose={() => setBlockConfirm(null)} alignment="center">
      <CModalHeader>
        <CModalTitle>Already Has an Account</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="small mb-0">
          User already has an account{blockConfirm?.existingUserName ? ` (${blockConfirm.existingUserName})` : ''},
          do you want to block this?
        </p>
      </CModalBody>
      <CModalFooter>
        <CButton size="sm" color="secondary" onClick={() => setBlockConfirm(null)}>Cancel</CButton>
        <CButton size="sm" color="danger" onClick={handleConfirmBlock} disabled={convertOne.isLoading}>
          {convertOne.isLoading ? <CSpinner size="sm" /> : 'Yes, block it'}
        </CButton>
      </CModalFooter>
    </CModal>

    <CCard>
      <CCardHeader>
        <strong>Subscribers</strong>
        <span className="ms-2 text-muted small">
          Onboard requests submitted via the app's pre-signup interest form
        </span>
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3 g-2">
          <CCol md={5}>
            <form onSubmit={handleSearch} className="d-flex gap-2">
              <CFormInput
                size="sm"
                placeholder="Search name, email, phone."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <CButton type="submit" color="primary" size="sm">Search</CButton>
            </form>
          </CCol>
          <CCol md={3}>
            <CFormSelect
              size="sm"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            >
              <option value="">Status: all</option>
              <option value="PENDING">Pending</option>
              <option value="CONTACTED">Contacted</option>
              <option value="CONVERTED">Converted</option>
              <option value="REJECTED">Rejected</option>
            </CFormSelect>
          </CCol>
          <CCol md={4}>
            <CFormSelect
              size="sm"
              value={userTypeFilter}
              onChange={(e) => { setUserTypeFilter(e.target.value); setPage(1) }}
            >
              <option value="">Role: all</option>
              <option value="PHOTOGRAPHER">Photographer</option>
              <option value="SERVICE_PROVIDER">Service Provider</option>
              <option value="TRIP_MANAGER">Trip Manager</option>
            </CFormSelect>
          </CCol>
        </CRow>

        {actionSuccess && (
          <CAlert color="success" dismissible onClose={() => setActionSuccess(null)}>
            {actionSuccess}
          </CAlert>
        )}
        {actionError && (
          <CAlert color="warning" dismissible onClose={() => setActionError(null)}>
            {actionError}
          </CAlert>
        )}

        {selectedIds.length > 0 && (
          <div className="d-flex align-items-center gap-2 mb-3 p-2 border rounded bg-light">
            <span className="small fw-semibold">{selectedIds.length} selected</span>
            <CButton
              size="sm"
              color="success"
              onClick={handleConvertSelected}
              disabled={convertBulk.isLoading}
            >
              {convertBulk.isLoading ? <CSpinner size="sm" /> : `Convert ${selectedIds.length}`}
            </CButton>
            <CButton size="sm" color="link" onClick={() => setSelectedIds([])}>Clear</CButton>
          </div>
        )}

        {isLoading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
        {isError && <CAlert color="danger">Failed to load subscribers.</CAlert>}

        {data && subscribers.length === 0 && (
          <p className="text-muted small">No subscriber requests yet.</p>
        )}

        {data && subscribers.length > 0 && (
          <>
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 36 }}>
                    <CFormCheck
                      checked={allConvertibleSelected}
                      disabled={convertibleIds.length === 0}
                      onChange={toggleSelectAll}
                    />
                  </CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <SortableHeader field="name" label="Name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>Contact</CTableHeaderCell>
                  <CTableHeaderCell>Role</CTableHeaderCell>
                  <SortableHeader field="createdAt" label="Submitted" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {subscribers.map((s, idx) => {
                  const isConverted = s.status === 'CONVERTED'
                  return (
                    <CTableRow key={s.id}>
                      <CTableDataCell>
                        {!isConverted && (
                          <CFormCheck
                            checked={selectedIds.includes(s.id)}
                            onChange={() => toggleSelectOne(s.id)}
                          />
                        )}
                      </CTableDataCell>
                      <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                      <CTableDataCell className="small fw-semibold">{s.name}</CTableDataCell>
                      <CTableDataCell className="small">
                        {s.email && <div>{s.email}</div>}
                        {s.phone && <div className="text-muted">{s.phone}</div>}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="light" textColor="dark" className="border">
                          {USER_TYPE_LABEL[s.userType] || s.userType}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small text-muted">{fmtDateTime(s.createdAt)}</CTableDataCell>
                      <CTableDataCell>
                        <CFormSelect
                          size="sm"
                          value={s.status}
                          disabled={updateStatus.isLoading || isConverted}
                          onChange={(e) => updateStatus.mutate({ id: s.id, status: e.target.value })}
                          style={{ width: 140 }}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="REJECTED">Rejected</option>
                          {/* CONVERTED is never a plain status pick — only the
                              "Convert" action (which actually creates the
                              account) can set it. */}
                          {isConverted && <option value="CONVERTED">Converted</option>}
                        </CFormSelect>
                      </CTableDataCell>
                      <CTableDataCell>
                        {!isConverted && (
                          <CButton
                            size="sm"
                            color="success"
                            variant="outline"
                            onClick={() => handleConvertOne(s.id)}
                            disabled={convertOne.isLoading || convertBulk.isLoading}
                          >
                            {convertingId === s.id ? <CSpinner size="sm" /> : 'Convert'}
                          </CButton>
                        )}
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
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
    </>
  )
}

export default SubscriberList
