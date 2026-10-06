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

const STATUS_BADGE = {
  PENDING: { color: 'warning', label: 'Pending' },
  CONTACTED: { color: 'info', label: 'Contacted' },
  REJECTED: { color: 'danger', label: 'Rejected' },
  CONVERTED: { color: 'success', label: 'Converted' },
}

// Which actions a row offers, by its current status. CONVERTED rows have none
// and can never be selected.
const ROW_ACTIONS = {
  PENDING: ['CONTACT', 'REJECT', 'CONVERT'],
  CONTACTED: ['REJECT', 'CONVERT'],
  REJECTED: ['CONTACT', 'CONVERT'],
  CONVERTED: [],
}

const ACTION_LABEL = {
  CONTACT: 'Contact',
  REJECT: 'Reject',
  CONVERT: 'Convert',
}

const ACTION_DONE_MESSAGE = {
  CONTACT: 'marked as contacted.',
  REJECT: 'rejected.',
  CONVERT: 'converted. Login credentials have been sent.',
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
  const [bulkAction, setBulkAction] = useState('')
  // { id } while waiting on the admin's yes/no for a single-row convert
  const [blockConfirm, setBlockConfirm] = useState(null)
  // Result of the last action: { success } and/or { skipped: [{ id, reason }] }
  const [report, setReport] = useState(null)
  const [actionError, setActionError] = useState(null)

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

  // Contact / Reject / bulk Convert all go through one endpoint; the backend
  // skips rows where the action doesn't apply and reports them back.
  const applyAction = useMutation({
    mutationFn: ({ action, ids }) => api.post('/api/admin/subscribers/apply', { action, ids }),
  })

  const convertOne = useMutation({
    mutationFn: ({ id, confirmBlock }) => api.post(`/api/admin/subscribers/${id}/convert`, { confirmBlock }),
  })

  const subscribers = data?.subscribers ?? []
  const nameById = Object.fromEntries(subscribers.map((s) => [s.id, s.name]))
  const selectableIds = subscribers.filter((s) => s.status !== 'CONVERTED').map((s) => s.id)
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id))

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : selectableIds)
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

  const clearReport = () => { setReport(null); setActionError(null) }

  // Runs one action over a set of ids and turns the per-row results into the
  // success line plus a list of skipped rows with their reasons.
  const runApply = async (action, ids) => {
    clearReport()
    try {
      const res = await applyAction.mutateAsync({ action, ids })
      const results = res.data.data.results
      const done = results.filter((r) => r.outcome === 'updated' || r.outcome === 'converted')
      const skipped = results
        .filter((r) => r.outcome !== 'updated' && r.outcome !== 'converted')
        .map((r) => ({
          id: r.id,
          reason: r.reason || (r.outcome === 'notFound' ? 'Subscriber not found' : 'Could not be processed'),
        }))
      setReport({
        success: done.length > 0 ? `${done.length} subscriber${done.length === 1 ? ' was' : 's were'} ${ACTION_DONE_MESSAGE[action]}` : null,
        skipped,
      })
      setSelectedIds([])
      refreshList()
    } catch (err) {
      setActionError(err?.response?.data?.message || `Failed to ${ACTION_LABEL[action].toLowerCase()} subscribers.`)
    }
  }

  const handleApply = () => {
    if (!bulkAction || selectedIds.length === 0) return
    runApply(bulkAction, selectedIds)
    setBulkAction('')
  }

  const handleConvertOne = async (id) => {
    clearReport()
    try {
      const res = await convertOne.mutateAsync({ id, confirmBlock: false })
      if (res.data.data.requiresConfirmation) {
        setBlockConfirm({ id, existingUserName: res.data.data.existingUserName })
        return
      }
      setReport({ success: `Subscriber ${ACTION_DONE_MESSAGE.CONVERT}`, skipped: [] })
      refreshList()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to convert subscriber.')
    }
  }

  const handleConfirmBlock = async () => {
    if (!blockConfirm) return
    clearReport()
    try {
      await convertOne.mutateAsync({ id: blockConfirm.id, confirmBlock: true })
      setReport({ success: 'Subscriber marked as rejected. The existing account was not changed.', skipped: [] })
      refreshList()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to update subscriber.')
    } finally {
      setBlockConfirm(null)
    }
  }

  // Spinner for one row's button only — the mutations are shared across rows.
  const rowBusy = (id, action) => action === 'CONVERT'
    ? convertOne.isPending && convertOne.variables?.id === id
    : applyAction.isPending && applyAction.variables?.action === action && applyAction.variables?.ids?.includes(id)

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
        <CButton size="sm" color="danger" onClick={handleConfirmBlock} disabled={convertOne.isPending}>
          {convertOne.isPending ? <CSpinner size="sm" /> : 'Yes, block it'}
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

        {report?.success && (
          <CAlert color="success" dismissible onClose={clearReport}>
            {report.success}
          </CAlert>
        )}
        {report?.skipped.length > 0 && (
          <CAlert color="warning" dismissible onClose={clearReport}>
            <div className="fw-semibold mb-1">
              {report.skipped.length} skipped
            </div>
            <ul className="small mb-0 ps-3">
              {report.skipped.map((s) => (
                <li key={s.id}>{nameById[s.id] || 'Subscriber'}: {s.reason}</li>
              ))}
            </ul>
          </CAlert>
        )}
        {actionError && (
          <CAlert color="danger" dismissible onClose={() => setActionError(null)}>
            {actionError}
          </CAlert>
        )}

        {selectedIds.length > 0 && (
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3 p-2 border rounded bg-light">
            <span className="small fw-semibold">{selectedIds.length} selected</span>
            <CFormSelect
              size="sm"
              style={{ width: 170 }}
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              disabled={applyAction.isPending}
            >
              <option value="">Choose action</option>
              <option value="CONTACT">Contact</option>
              <option value="REJECT">Reject</option>
              <option value="CONVERT">Convert</option>
            </CFormSelect>
            <CButton
              size="sm"
              color="primary"
              onClick={handleApply}
              disabled={!bulkAction || applyAction.isPending}
            >
              {applyAction.isPending ? (
                <>
                  <CSpinner size="sm" className="me-1" />
                  Applying…
                </>
              ) : 'Apply'}
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
                      checked={allSelected}
                      disabled={selectableIds.length === 0}
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
                  const badge = STATUS_BADGE[s.status] || { color: 'secondary', label: s.status }
                  const actions = ROW_ACTIONS[s.status] || []
                  return (
                    <CTableRow key={s.id}>
                      <CTableDataCell>
                        {actions.length > 0 && (
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
                        <CBadge color={badge.color}>{badge.label}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex flex-wrap gap-1">
                          {actions.map((action) => (
                            <CButton
                              key={action}
                              size="sm"
                              variant="outline"
                              color={action === 'CONVERT' ? 'success' : action === 'REJECT' ? 'danger' : 'primary'}
                              disabled={applyAction.isPending || convertOne.isPending}
                              onClick={() => (action === 'CONVERT'
                                ? handleConvertOne(s.id)
                                : runApply(action, [s.id]))}
                            >
                              {rowBusy(s.id, action) ? <CSpinner size="sm" /> : ACTION_LABEL[action]}
                            </CButton>
                          ))}
                        </div>
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
