import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert, CFormInput, CFormSelect,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormLabel, CFormTextarea, CFormCheck,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'
import { formatRupees as fmt, CURRENCY } from '../../lib/constants'

const KIND_LABELS = {
  PERCENT_OFF: 'Percent Off',
  FLAT_AMOUNT_OFF: 'Flat Amount Off',
  PLATFORM_FEE_WAIVER: 'Platform Fee Waiver',
}
const KIND_COLOR = {
  PERCENT_OFF: 'info',
  FLAT_AMOUNT_OFF: 'primary',
  PLATFORM_FEE_WAIVER: 'warning',
}

const EMPTY_FORM = {
  code: '',
  kind: 'PERCENT_OFF',
  percentValue: '',   // UI-only, converted to `value` (0-1 fraction) on save
  rupeeValue: '',     // UI-only, converted to `valueMinor` on save
  waiverPercentValue: '', // UI-only (PLATFORM_FEE_WAIVER), converted to `value` (0-1 fraction) on save — 100 = full waiver
  validFrom: '',
  validUntil: '',
  maxRedemptions: '',
  maxRedemptionsPerUser: '1',
  fundedBy: 'PLATFORM',
  active: true,
  scope: '',
}

const describeValue = (d) => {
  if (d.kind === 'PERCENT_OFF') return `${(Number(d.value) * 100).toFixed(0)}%`
  if (d.kind === 'FLAT_AMOUNT_OFF') return fmt(d.valueMinor)
  return `${(Number(d.value) * 100).toFixed(0)}% fee waived`
}

const DiscountList = () => {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const offset = (page - 1) * pageSize

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [mutError, setMutError] = useState('')
  const [jsonError, setJsonError] = useState(null)
  const [success, setSuccess] = useState('')

  const [statsFor, setStatsFor] = useState(null) // discount id whose stats modal is open

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000) }
  const f = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const handleSort = (field, order) => { setSortBy(field); setSortOrder(order); setPage(1) }

  const validateJson = (val) => {
    if (!val || val.trim() === '') { setJsonError(null); return }
    try { JSON.parse(val); setJsonError(null) }
    catch { setJsonError('Invalid JSON') }
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-discounts', { page, pageSize, search, activeFilter, sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: pageSize, offset, sortBy, sortOrder })
      if (search.trim()) params.set('search', search.trim())
      if (activeFilter) params.set('active', activeFilter)
      const res = await api.get(`/api/admin/discounts?${params}`)
      return res.data.data
    },
    placeholderData: (prev) => prev,
  })

  const openCreate = () => {
    setEditId(null); setForm(EMPTY_FORM); setMutError(''); setJsonError(null); setModal(true)
  }

  const openEdit = (d) => {
    setEditId(d.id)
    setForm({
      code: d.code,
      kind: d.kind,
      percentValue: d.kind === 'PERCENT_OFF' ? String(Number(d.value) * 100) : '',
      rupeeValue: d.kind === 'FLAT_AMOUNT_OFF' ? String(Number(d.valueMinor || 0) / CURRENCY.MINOR_UNIT) : '',
      waiverPercentValue: d.kind === 'PLATFORM_FEE_WAIVER' ? String(Number(d.value) * 100) : '',
      validFrom: d.validFrom ? d.validFrom.slice(0, 10) : '',
      validUntil: d.validUntil ? d.validUntil.slice(0, 10) : '',
      maxRedemptions: d.maxRedemptions != null ? String(d.maxRedemptions) : '',
      maxRedemptionsPerUser: String(d.maxRedemptionsPerUser ?? 1),
      fundedBy: d.fundedBy,
      active: d.active,
      scope: d.scope && Object.keys(d.scope).length ? JSON.stringify(d.scope, null, 2) : '',
    })
    setMutError(''); setJsonError(null); setModal(true)
  }

  const buildPayload = () => {
    const payload = {
      code: form.code.trim().toUpperCase(),
      kind: form.kind,
      validFrom: form.validFrom,
      validUntil: form.validUntil || undefined,
      maxRedemptions: form.maxRedemptions ? parseInt(form.maxRedemptions, 10) : undefined,
      maxRedemptionsPerUser: parseInt(form.maxRedemptionsPerUser, 10) || 1,
      fundedBy: form.fundedBy,
      active: form.active,
      scope: form.scope.trim() ? JSON.parse(form.scope) : undefined,
    }
    if (form.kind === 'PERCENT_OFF') {
      payload.value = (parseFloat(form.percentValue) || 0) / 100
    } else if (form.kind === 'FLAT_AMOUNT_OFF') {
      payload.value = 0
      payload.valueMinor = Math.round((parseFloat(form.rupeeValue) || 0) * CURRENCY.MINOR_UNIT)
    } else {
      payload.value = (parseFloat(form.waiverPercentValue) || 0) / 100
    }
    return payload
  }

  const createMut = useMutation({
    mutationFn: (payload) => api.post('/api/admin/discounts', payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-discounts'] })
      setModal(false); flash('Coupon created.')
    },
    onError: (err) => setMutError(err?.response?.data?.message || 'Failed to create coupon.'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/api/admin/discounts/${id}`, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-discounts'] })
      setModal(false); flash('Coupon updated.')
    },
    onError: (err) => setMutError(err?.response?.data?.message || 'Failed to update coupon.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/discounts/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-discounts'] })
      flash('Coupon deleted.')
    },
    onError: (err) => flash(err?.response?.data?.message || 'Failed to delete coupon.'),
  })

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, active }) => api.patch(`/api/admin/discounts/${id}`, { active }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['admin-discounts'] }) },
  })

  const handleSave = () => {
    if (jsonError) { setMutError('Fix JSON error in Scope before saving.'); return }
    const payload = buildPayload()
    if (editId) updateMut.mutate({ id: editId, payload })
    else createMut.mutate(payload)
  }

  const isSaving = createMut.isLoading || updateMut.isLoading
  const canSave =
    form.code.trim() &&
    form.validFrom &&
    (form.kind !== 'PERCENT_OFF' || form.percentValue) &&
    (form.kind !== 'FLAT_AMOUNT_OFF' || form.rupeeValue) &&
    (form.kind !== 'PLATFORM_FEE_WAIVER' || form.waiverPercentValue)

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-discount-stats', statsFor],
    queryFn: () => api.get(`/api/admin/discounts/${statsFor}/stats`).then((r) => r.data.data),
    enabled: !!statsFor,
  })

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <strong>Coupons</strong>
          <CButton size="sm" color="primary" onClick={openCreate}>+ New Coupon</CButton>
        </CCardHeader>
        <CCardBody>
          {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}

          <div className="d-flex gap-2 mb-3 flex-wrap">
            <CFormInput
              size="sm" placeholder="Search code..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              style={{ maxWidth: 240 }}
            />
            <CFormSelect
              size="sm" style={{ maxWidth: 160 }}
              value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </CFormSelect>
          </div>

          {isLoading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
          {isError && <CAlert color="danger">Failed to load coupons.</CAlert>}

          {data && data.discounts.length === 0 && (
            <div className="text-muted small text-center py-3">No coupons found.</div>
          )}

          {data && data.discounts.length > 0 && (
            <>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell style={{ width: 40 }}>#</CTableHeaderCell>
                    <SortableHeader field="code" label="Code" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <CTableHeaderCell>Kind</CTableHeaderCell>
                    <CTableHeaderCell>Value</CTableHeaderCell>
                    <SortableHeader field="validFrom" label="Valid From" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <CTableHeaderCell>Valid Until</CTableHeaderCell>
                    <SortableHeader field="redemptionCount" label="Redemptions" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <CTableHeaderCell>Funded By</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {data.discounts.map((d, idx) => (
                    <CTableRow key={d.id}>
                      <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                      <CTableDataCell><code className="small fw-semibold">{d.code}</code></CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={KIND_COLOR[d.kind] || 'secondary'}>{KIND_LABELS[d.kind]}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small">{describeValue(d)}</CTableDataCell>
                      <CTableDataCell className="small text-muted">{fmtDate(d.validFrom)}</CTableDataCell>
                      <CTableDataCell className="small text-muted">
                        {d.validUntil ? fmtDate(d.validUntil) : '—'}
                      </CTableDataCell>
                      <CTableDataCell className="small">
                        <CButton size="sm" color="link" className="p-0" onClick={() => setStatsFor(d.id)}>
                          {d.redemptionCount}{d.maxRedemptions != null ? ` / ${d.maxRedemptions}` : ''}
                        </CButton>
                      </CTableDataCell>
                      <CTableDataCell className="small">{d.fundedBy?.replace(/_/g, ' ')}</CTableDataCell>
                      <CTableDataCell>
                        {toggleActiveMut.isLoading && toggleActiveMut.variables?.id === d.id ? (
                          <CSpinner size="sm" />
                        ) : (
                          <CBadge
                            color={d.active ? 'success' : 'secondary'}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              const next = !d.active
                              const verb = next ? 'activate' : 'deactivate'
                              if (window.confirm(`Are you sure you want to ${verb} coupon "${d.code}"?`)) {
                                toggleActiveMut.mutate({ id: d.id, active: next })
                              }
                            }}
                          >
                            {d.active ? 'Active' : 'Inactive'}
                          </CBadge>
                        )}
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex gap-1">
                          <CButton
                            size="sm" color="outline-primary" title="Edit"
                            onClick={() => openEdit(d)}
                          >
                            <CIcon icon={cilPencil} size="sm" />
                          </CButton>
                          <CButton
                            size="sm" color="outline-danger"
                            disabled={deleteMut.isLoading && deleteMut.variables === d.id}
                            title={d.redemptionCount > 0 ? 'Redeemed coupons can only be deactivated' : 'Delete'}
                            onClick={() => {
                              if (d.redemptionCount > 0) {
                                flash("This coupon has been redeemed — deactivate it instead of deleting.")
                                return
                              }
                              if (window.confirm(`Delete coupon "${d.code}"?`)) deleteMut.mutate(d.id)
                            }}
                          >
                            {deleteMut.isLoading && deleteMut.variables === d.id
                              ? <CSpinner size="sm" />
                              : <CIcon icon={cilTrash} size="sm" />}
                          </CButton>
                        </div>
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
                onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
              />
            </>
          )}
        </CCardBody>
      </CCard>

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      <CModal size="lg" visible={modal} onClose={() => { setModal(false); setMutError('') }}>
        <CModalHeader>
          <CModalTitle>{editId ? 'Edit' : 'New'} Coupon</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">
            <div className="row g-3">
              <div className="col-md-6">
                <CFormLabel className="small">Code *</CFormLabel>
                <CFormInput
                  size="sm" value={form.code}
                  onChange={(e) => f('code', e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME10"
                  disabled={!!editId}
                />
                {editId && <div className="text-muted small mt-1">Code can't be changed after creation.</div>}
              </div>
              <div className="col-md-6">
                <CFormLabel className="small">Kind *</CFormLabel>
                <CFormSelect size="sm" value={form.kind} onChange={(e) => f('kind', e.target.value)}>
                  <option value="PERCENT_OFF">Percent Off</option>
                  <option value="FLAT_AMOUNT_OFF">Flat Amount Off</option>
                  <option value="PLATFORM_FEE_WAIVER">Platform Fee Waiver</option>
                </CFormSelect>
              </div>
            </div>

            {form.kind === 'PERCENT_OFF' && (
              <div className="row g-3">
                <div className="col-md-6">
                  <CFormLabel className="small">Percent Off (%) *</CFormLabel>
                  <CFormInput
                    size="sm" type="number" min="0" max="100" step="0.01"
                    value={form.percentValue}
                    onChange={(e) => f('percentValue', e.target.value)}
                    placeholder="e.g. 10"
                  />
                </div>
              </div>
            )}
            {form.kind === 'FLAT_AMOUNT_OFF' && (
              <div className="row g-3">
                <div className="col-md-6">
                  <CFormLabel className="small">Amount Off ({CURRENCY.SYMBOL}) *</CFormLabel>
                  <CFormInput
                    size="sm" type="number" min="0" step="0.01"
                    value={form.rupeeValue}
                    onChange={(e) => f('rupeeValue', e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
              </div>
            )}
            {form.kind === 'PLATFORM_FEE_WAIVER' && (
              <div className="row g-3">
                <div className="col-md-6">
                  <CFormLabel className="small">Fee Waived (%) *</CFormLabel>
                  <CFormInput
                    size="sm" type="number" min="0" max="100" step="1"
                    value={form.waiverPercentValue}
                    onChange={(e) => f('waiverPercentValue', e.target.value)}
                    placeholder="100 for a full waiver, 50 for half"
                  />
                </div>
              </div>
            )}

            <div className="row g-3">
              <div className="col-md-6">
                <CFormLabel className="small">Valid From *</CFormLabel>
                <CFormInput size="sm" type="date" value={form.validFrom} onChange={(e) => f('validFrom', e.target.value)} />
              </div>
              <div className="col-md-6">
                <CFormLabel className="small">Valid Until <span className="text-muted fw-normal">(optional — no expiry)</span></CFormLabel>
                <CFormInput size="sm" type="date" value={form.validUntil} onChange={(e) => f('validUntil', e.target.value)} />
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-4">
                <CFormLabel className="small">Max Redemptions <span className="text-muted fw-normal">(blank = unlimited)</span></CFormLabel>
                <CFormInput
                  size="sm" type="number" min="1"
                  value={form.maxRedemptions}
                  onChange={(e) => f('maxRedemptions', e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <CFormLabel className="small">Max Redemptions / User</CFormLabel>
                <CFormInput
                  size="sm" type="number" min="1"
                  value={form.maxRedemptionsPerUser}
                  onChange={(e) => f('maxRedemptionsPerUser', e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <CFormLabel className="small">Funded By *</CFormLabel>
                <CFormSelect size="sm" value={form.fundedBy} onChange={(e) => f('fundedBy', e.target.value)}>
                  <option value="PLATFORM">Platform</option>
                  <option value="TRIP_OWNER">Trip Owner</option>
                  <option value="SERVICE_PROVIDER">Service Provider</option>
                </CFormSelect>
              </div>
            </div>

            <div>
              <CFormLabel className="small">
                Scope (JSON, optional) <span className="text-muted fw-normal">— tripIds / userIds / userRoles / productKind</span>
              </CFormLabel>
              <CFormTextarea
                size="sm" rows={3}
                value={form.scope}
                onChange={(e) => { f('scope', e.target.value); validateJson(e.target.value) }}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
                placeholder={'{"userRoles":["PHOTOGRAPHER"]}'}
              />
              {jsonError && <div className="text-danger small mt-1">{jsonError}</div>}
            </div>

            <div>
              <CFormCheck
                id="active" label="Active"
                checked={form.active}
                onChange={(e) => f('active', e.target.checked)}
              />
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter className="flex-column align-items-stretch gap-2">
          {mutError && <CAlert color="danger" className="mb-0 py-2 small">{mutError}</CAlert>}
          <div className="d-flex justify-content-end gap-2">
            <CButton color="secondary" onClick={() => { setModal(false); setMutError('') }}>Cancel</CButton>
            <CButton color="primary" onClick={handleSave} disabled={isSaving || !canSave}>
              {isSaving ? <CSpinner size="sm" /> : editId ? 'Save Changes' : 'Create'}
            </CButton>
          </div>
        </CModalFooter>
      </CModal>

      {/* ── Stats Modal ──────────────────────────────────────────────────────── */}
      <CModal size="lg" visible={!!statsFor} onClose={() => setStatsFor(null)}>
        <CModalHeader>
          <CModalTitle>Coupon Stats {statsData ? `— ${statsData.discount.code}` : ''}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {statsLoading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
          {statsData && (
            <>
              <div className="row g-3 mb-3">
                <div className="col-4">
                  <div className="small text-muted">Total Redemptions</div>
                  <div className="fs-5 fw-semibold">{statsData.totalRedemptions}</div>
                </div>
                <div className="col-4">
                  <div className="small text-muted">Total Discounted</div>
                  <div className="fs-5 fw-semibold">{fmt(statsData.totalDiscountedMinor)}</div>
                </div>
                <div className="col-4">
                  <div className="small text-muted">Remaining</div>
                  <div className="fs-5 fw-semibold">
                    {statsData.remainingRedemptions != null ? statsData.remainingRedemptions : 'Unlimited'}
                  </div>
                </div>
              </div>

              {statsData.recentRedemptions.length === 0 ? (
                <div className="text-muted small text-center py-3">No redemptions yet.</div>
              ) : (
                <CTable hover responsive small>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>User</CTableHeaderCell>
                      <CTableHeaderCell>Trip</CTableHeaderCell>
                      <CTableHeaderCell>Amount</CTableHeaderCell>
                      <CTableHeaderCell>Redeemed At</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {statsData.recentRedemptions.map((r) => (
                      <CTableRow key={r.id}>
                        <CTableDataCell className="small">
                          <div className="fw-semibold">{r.payment?.fromUser?.name}</div>
                          <div className="text-muted">{r.payment?.fromUser?.email}</div>
                        </CTableDataCell>
                        <CTableDataCell className="small">{r.payment?.trip?.title}</CTableDataCell>
                        <CTableDataCell className="small fw-semibold">{fmt(r.amountMinor)}</CTableDataCell>
                        <CTableDataCell className="small text-muted">{fmtDateTime(r.redeemedAt)}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setStatsFor(null)}>Close</CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default DiscountList
