import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormLabel, CFormInput, CFormSelect, CFormTextarea,
  CNav, CNavItem, CNavLink, CTabContent, CTabPane,
} from '@coreui/react'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'


const isActive = (p) => {
  const now = new Date()
  const from = p.effectiveFrom ? new Date(p.effectiveFrom) : null
  const until = p.effectiveUntil ? new Date(p.effectiveUntil) : null
  if (!from || from > now) return false
  if (until && until < now) return false
  return true
}

const REFUND_APPLIES_TO = [
  'ALL',
  'PARTICIPANT_SELF_CANCEL',
  'PROVIDER_SELF_CANCEL',
  'PARTICIPANT_TM_CANCEL',
  'PROVIDER_TM_CANCEL',
]

const EMPTY_PAYOUT = {
  type: 'PAYOUT',
  name: '',
  effectiveFrom: '',
  effectiveUntil: '',
  notes: '',
  recipientRole: 'TRIP_MANAGER',
  milestones: '',
  nonVerifiedMilestone: '',
  disputeWindowDays: '3',
}

const EMPTY_REFUND = {
  type: 'REFUND',
  name: '',
  effectiveFrom: '',
  effectiveUntil: '',
  notes: '',
  appliesTo: 'ALL',
  tiers: '',
}

// PolicyConfig(type=PAYMENT_SCHEDULE) reuses the same `milestones` JSON
// column PAYOUT uses (schema convenience, see generate-participant.ts) —
// the form key stays `milestones` here too so buildPayload/openEdit need no
// special-casing, the UI just labels it "Installments".
const EMPTY_PAYMENT_SCHEDULE = {
  type: 'PAYMENT_SCHEDULE',
  name: '',
  effectiveFrom: '',
  effectiveUntil: '',
  notes: '',
  milestones: '',
}

const TYPE_LABEL = { PAYOUT: 'Payout', REFUND: 'Refund', PAYMENT_SCHEDULE: 'Payment Schedule' }

const parseJson = (str) => {
  if (!str || str.trim() === '') return undefined
  try { return JSON.parse(str) } catch { return str }
}

const toJsonStr = (val) => {
  if (val == null) return ''
  if (typeof val === 'string') return val
  return JSON.stringify(val, null, 2)
}

const PolicySettings = () => {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('PAYOUT')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_PAYOUT)
  const [success, setSuccess] = useState('')
  const [mutError, setMutError] = useState('')
  const [jsonErrors, setJsonErrors] = useState({})

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000) }
  const f = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const validateJson = (field, val) => {
    if (!val || val.trim() === '') { setJsonErrors((e) => ({ ...e, [field]: null })); return }
    try { JSON.parse(val); setJsonErrors((e) => ({ ...e, [field]: null })) }
    catch { setJsonErrors((e) => ({ ...e, [field]: 'Invalid JSON' })) }
  }

  const { data: payoutPolicies, isLoading: loadingPayout, isError: errPayout } = useQuery({
    queryKey: ['admin-policy-configs', 'PAYOUT'],
    queryFn: () => api.get('/api/admin/policy-configs?type=PAYOUT').then((r) => r.data.data),
  })

  const { data: refundPolicies, isLoading: loadingRefund, isError: errRefund } = useQuery({
    queryKey: ['admin-policy-configs', 'REFUND'],
    queryFn: () => api.get('/api/admin/policy-configs?type=REFUND').then((r) => r.data.data),
  })

  const { data: schedulePolicies, isLoading: loadingSchedule, isError: errSchedule } = useQuery({
    queryKey: ['admin-policy-configs', 'PAYMENT_SCHEDULE'],
    queryFn: () => api.get('/api/admin/policy-configs?type=PAYMENT_SCHEDULE').then((r) => r.data.data),
  })

  const openCreate = (type) => {
    setEditId(null)
    setForm(type === 'PAYOUT' ? EMPTY_PAYOUT : type === 'REFUND' ? EMPTY_REFUND : EMPTY_PAYMENT_SCHEDULE)
    setMutError('')
    setJsonErrors({})
    setModal(true)
  }

  const openEdit = (p) => {
    setEditId(p.id)
    if (p.type === 'PAYOUT') {
      setForm({
        type: 'PAYOUT',
        name: p.name || '',
        effectiveFrom: p.effectiveFrom ? p.effectiveFrom.slice(0, 10) : '',
        effectiveUntil: p.effectiveUntil ? p.effectiveUntil.slice(0, 10) : '',
        notes: p.notes || '',
        recipientRole: p.recipientRole || 'TRIP_MANAGER',
        milestones: toJsonStr(p.milestones),
        nonVerifiedMilestone: toJsonStr(p.nonVerifiedMilestone),
        disputeWindowDays: String(p.disputeWindowDays ?? 3),
      })
    } else if (p.type === 'PAYMENT_SCHEDULE') {
      setForm({
        type: 'PAYMENT_SCHEDULE',
        name: p.name || '',
        effectiveFrom: p.effectiveFrom ? p.effectiveFrom.slice(0, 10) : '',
        effectiveUntil: p.effectiveUntil ? p.effectiveUntil.slice(0, 10) : '',
        notes: p.notes || '',
        milestones: toJsonStr(p.milestones),
      })
    } else {
      setForm({
        type: 'REFUND',
        name: p.name || '',
        effectiveFrom: p.effectiveFrom ? p.effectiveFrom.slice(0, 10) : '',
        effectiveUntil: p.effectiveUntil ? p.effectiveUntil.slice(0, 10) : '',
        notes: p.notes || '',
        appliesTo: p.appliesTo || 'ALL',
        tiers: toJsonStr(p.tiers),
      })
    }
    setMutError('')
    setJsonErrors({})
    setModal(true)
  }

  const buildPayload = () => {
    const base = {
      type: form.type,
      name: form.name || undefined,
      effectiveFrom: form.effectiveFrom,
      effectiveUntil: form.effectiveUntil || undefined,
      notes: form.notes || undefined,
    }
    if (form.type === 'PAYOUT') {
      return {
        ...base,
        recipientRole: form.recipientRole || undefined,
        milestones: parseJson(form.milestones),
        nonVerifiedMilestone: parseJson(form.nonVerifiedMilestone),
        disputeWindowDays: form.disputeWindowDays ? parseInt(form.disputeWindowDays, 10) : undefined,
      }
    }
    if (form.type === 'PAYMENT_SCHEDULE') {
      return {
        ...base,
        milestones: parseJson(form.milestones),
      }
    }
    return {
      ...base,
      appliesTo: form.appliesTo || undefined,
      tiers: parseJson(form.tiers),
    }
  }

  const createMut = useMutation({
    mutationFn: (payload) => api.post('/api/admin/policy-configs', payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-policy-configs'] })
      setModal(false)
      flash(`${TYPE_LABEL[form.type]} policy created.`)
    },
    onError: (err) => setMutError(err?.response?.data?.message || 'Failed to create policy.'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/api/admin/policy-configs/${id}`, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-policy-configs'] })
      setModal(false)
      flash('Policy updated.')
    },
    onError: (err) => setMutError(err?.response?.data?.message || 'Failed to update policy.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/policy-configs/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-policy-configs'] })
      flash('Policy deleted.')
    },
    onError: (err) => setMutError(err?.response?.data?.message || 'Failed to delete policy.'),
  })

  const handleSave = () => {
    const hasJsonErr = Object.values(jsonErrors).some(Boolean)
    if (hasJsonErr) { setMutError('Fix JSON errors before saving.'); return }
    const payload = buildPayload()
    if (editId) updateMut.mutate({ id: editId, payload })
    else createMut.mutate(payload)
  }

  const isSaving = createMut.isLoading || updateMut.isLoading

  const PolicyTable = ({ policies, loading, error, type }) => (
    <>
      {loading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
      {error && <CAlert color="danger">Failed to load {type.toLowerCase()} policies.</CAlert>}
      {policies && policies.length === 0 && (
        <div className="text-muted small py-3 text-center">No {type.toLowerCase()} policies yet.</div>
      )}
      {policies && policies.length > 0 && (
        <CTable hover responsive small>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell style={{ width: 40 }}>#</CTableHeaderCell>
              <CTableHeaderCell>Name</CTableHeaderCell>
              {type === 'PAYOUT' && <CTableHeaderCell>Recipient Role</CTableHeaderCell>}
              {type === 'PAYOUT' && <CTableHeaderCell>Dispute Window</CTableHeaderCell>}
              {type === 'REFUND' && <CTableHeaderCell>Applies To</CTableHeaderCell>}
              {type === 'PAYMENT_SCHEDULE' && <CTableHeaderCell>Installments</CTableHeaderCell>}
              <CTableHeaderCell>Effective From</CTableHeaderCell>
              <CTableHeaderCell>Effective Until</CTableHeaderCell>
              <CTableHeaderCell>Status</CTableHeaderCell>
              <CTableHeaderCell>Notes</CTableHeaderCell>
              <CTableHeaderCell>Actions</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {policies.map((p, idx) => {
              const active = isActive(p)
              return (
                <CTableRow key={p.id}>
                  <CTableDataCell className="small text-muted">{idx + 1}</CTableDataCell>
                  <CTableDataCell className="small fw-semibold">{p.name || '—'}</CTableDataCell>
                  {type === 'PAYOUT' && (
                    <CTableDataCell>
                      {p.recipientRole
                        ? <CBadge color="info">{p.recipientRole.replace(/_/g, ' ')}</CBadge>
                        : <span className="text-muted small">—</span>}
                    </CTableDataCell>
                  )}
                  {type === 'PAYOUT' && (
                    <CTableDataCell className="small">{p.disputeWindowDays != null ? `${p.disputeWindowDays}d` : '—'}</CTableDataCell>
                  )}
                  {type === 'REFUND' && (
                    <CTableDataCell>
                      {p.appliesTo
                        ? <CBadge color="warning" textColor="dark">{p.appliesTo.replace(/_/g, ' ')}</CBadge>
                        : <span className="text-muted small">—</span>}
                    </CTableDataCell>
                  )}
                  {type === 'PAYMENT_SCHEDULE' && (
                    <CTableDataCell className="small">
                      {Array.isArray(p.milestones) ? `${p.milestones.length} installment${p.milestones.length === 1 ? '' : 's'}` : '—'}
                    </CTableDataCell>
                  )}
                  <CTableDataCell className="small">{fmtDate(p.effectiveFrom)}</CTableDataCell>
                  <CTableDataCell className="small">{fmtDate(p.effectiveUntil)}</CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={active ? 'success' : 'secondary'}>
                      {active ? 'Active' : 'Not Active'}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="small text-muted">{p.notes || '—'}</CTableDataCell>
                  <CTableDataCell>
                    <div className="d-flex gap-1">
                      <CButton size="sm" color="outline-primary" onClick={() => openEdit(p)}>Edit</CButton>
                      <CButton
                        size="sm" color="outline-danger"
                        disabled={deleteMut.isLoading && deleteMut.variables === p.id}
                        onClick={() => { if (window.confirm('Delete this policy?')) deleteMut.mutate(p.id) }}
                      >
                        {deleteMut.isLoading && deleteMut.variables === p.id ? <CSpinner size="sm" /> : 'Del'}
                      </CButton>
                    </div>
                  </CTableDataCell>
                </CTableRow>
              )
            })}
          </CTableBody>
        </CTable>
      )}
    </>
  )

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Payout / Refund / Payment Schedule Policies</strong>
          <CButton size="sm" color="primary" onClick={() => openCreate(activeTab)}>
            + New {TYPE_LABEL[activeTab]} Policy
          </CButton>
        </CCardHeader>
        <CCardBody>
          {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}
          {mutError && !modal && <CAlert color="danger" dismissible onClose={() => setMutError('')}>{mutError}</CAlert>}

          <CNav variant="tabs" className="mb-3">
            <CNavItem>
              <CNavLink active={activeTab === 'PAYOUT'} onClick={() => setActiveTab('PAYOUT')} style={{ cursor: 'pointer' }}>
                Payout Policies
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={activeTab === 'REFUND'} onClick={() => setActiveTab('REFUND')} style={{ cursor: 'pointer' }}>
                Refund Policies
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={activeTab === 'PAYMENT_SCHEDULE'} onClick={() => setActiveTab('PAYMENT_SCHEDULE')} style={{ cursor: 'pointer' }}>
                Payment Schedule Policies
              </CNavLink>
            </CNavItem>
          </CNav>

          <CTabContent>
            <CTabPane visible={activeTab === 'PAYOUT'}>
              <PolicyTable policies={payoutPolicies} loading={loadingPayout} error={errPayout} type="PAYOUT" />
            </CTabPane>
            <CTabPane visible={activeTab === 'REFUND'}>
              <PolicyTable policies={refundPolicies} loading={loadingRefund} error={errRefund} type="REFUND" />
            </CTabPane>
            <CTabPane visible={activeTab === 'PAYMENT_SCHEDULE'}>
              <PolicyTable policies={schedulePolicies} loading={loadingSchedule} error={errSchedule} type="PAYMENT_SCHEDULE" />
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>

      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      <CModal size="lg" visible={modal} onClose={() => { setModal(false); setMutError('') }}>
        <CModalHeader>
          <CModalTitle>{editId ? 'Edit' : 'New'} {TYPE_LABEL[form.type]} Policy</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">

            {/* Shared fields */}
            <div className="row g-3">
              <div className="col-md-6">
                <CFormLabel className="small">Name (optional)</CFormLabel>
                <CFormInput size="sm" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="e.g. Standard Payout Policy v1" />
              </div>
              <div className="col-md-3">
                <CFormLabel className="small">Effective From *</CFormLabel>
                <CFormInput size="sm" type="date" value={form.effectiveFrom} onChange={(e) => f('effectiveFrom', e.target.value)} />
              </div>
              <div className="col-md-3">
                <CFormLabel className="small">Effective Until</CFormLabel>
                <CFormInput size="sm" type="date" value={form.effectiveUntil} onChange={(e) => f('effectiveUntil', e.target.value)} />
              </div>
            </div>

            <div>
              <CFormLabel className="small">Notes</CFormLabel>
              <CFormInput size="sm" value={form.notes} onChange={(e) => f('notes', e.target.value)} />
            </div>

            <hr className="my-1" />

            {/* PAYOUT-specific fields */}
            {form.type === 'PAYOUT' && (
              <>
                <div className="row g-3">
                  <div className="col-md-6">
                    <CFormLabel className="small">Recipient Role</CFormLabel>
                    <CFormSelect size="sm" value={form.recipientRole} onChange={(e) => f('recipientRole', e.target.value)}>
                      <option value="TRIP_MANAGER">Trip Manager</option>
                      <option value="SERVICE_PROVIDER">Service Provider</option>
                    </CFormSelect>
                  </div>
                  <div className="col-md-6">
                    <CFormLabel className="small">Dispute Window (days)</CFormLabel>
                    <CFormInput size="sm" type="number" min="0" value={form.disputeWindowDays} onChange={(e) => f('disputeWindowDays', e.target.value)} />
                  </div>
                </div>
                <div>
                  <CFormLabel className="small">
                    Milestones (JSON array)
                    <span className="text-muted ms-1 fw-normal">e.g. [{`{"position":0,"sharePct":0.5,"triggerKind":"BOOKING_CONFIRMED","triggerOffsetDays":0}`}]</span>
                  </CFormLabel>
                  <CFormTextarea
                    size="sm" rows={4} value={form.milestones}
                    onChange={(e) => { f('milestones', e.target.value); validateJson('milestones', e.target.value) }}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                  {jsonErrors.milestones && <div className="text-danger small mt-1">{jsonErrors.milestones}</div>}
                </div>
                <div>
                  <CFormLabel className="small">
                    Non-Verified Milestone (JSON)
                    <span className="text-muted ms-1 fw-normal">e.g. {`{"sharePct":1.0,"triggerKind":"TRIP_COMPLETED","triggerOffsetDays":30}`}</span>
                  </CFormLabel>
                  <CFormTextarea
                    size="sm" rows={3} value={form.nonVerifiedMilestone}
                    onChange={(e) => { f('nonVerifiedMilestone', e.target.value); validateJson('nonVerifiedMilestone', e.target.value) }}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                  {jsonErrors.nonVerifiedMilestone && <div className="text-danger small mt-1">{jsonErrors.nonVerifiedMilestone}</div>}
                </div>
              </>
            )}

            {/* PAYMENT_SCHEDULE-specific fields — reuses the same `milestones`
                JSON column PAYOUT uses (schema convenience), just a
                different vocabulary: participant installments, not payout
                milestones. See generate-participant.ts's ParticipantInstallment. */}
            {form.type === 'PAYMENT_SCHEDULE' && (
              <div>
                <CFormLabel className="small">
                  Installments (JSON array, ascending position, sharePct summing to 1.0)
                  <span className="text-muted ms-1 fw-normal">
                    e.g. [{`{"position":0,"sharePct":0.3,"label":"Booking Amount","triggerKind":"BOOKING","triggerOffsetDays":0}`}]
                  </span>
                </CFormLabel>
                <CFormTextarea
                  size="sm" rows={6} value={form.milestones}
                  onChange={(e) => { f('milestones', e.target.value); validateJson('milestones', e.target.value) }}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
                {jsonErrors.milestones && <div className="text-danger small mt-1">{jsonErrors.milestones}</div>}
                <div className="text-muted small mt-1">
                  triggerKind: BOOKING · TRIP_START · TRIP_END — see triggerDate() in generate-participant.ts for offset semantics.
                </div>
              </div>
            )}

            {/* REFUND-specific fields */}
            {form.type === 'REFUND' && (
              <>
                <div>
                  <CFormLabel className="small">Applies To</CFormLabel>
                  <CFormSelect size="sm" value={form.appliesTo} onChange={(e) => f('appliesTo', e.target.value)}>
                    {REFUND_APPLIES_TO.map((v) => (
                      <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
                    ))}
                  </CFormSelect>
                </div>
                <div>
                  <CFormLabel className="small">
                    Refund Tiers (JSON array, desc order by daysBeforeTrip)
                    <span className="text-muted ms-1 fw-normal">e.g. [{`{"daysBeforeTrip":30,"refundPct":1.0,"label":"Full refund"}`}]</span>
                  </CFormLabel>
                  <CFormTextarea
                    size="sm" rows={5} value={form.tiers}
                    onChange={(e) => { f('tiers', e.target.value); validateJson('tiers', e.target.value) }}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                  {jsonErrors.tiers && <div className="text-danger small mt-1">{jsonErrors.tiers}</div>}
                </div>
              </>
            )}
          </CForm>
        </CModalBody>
        <CModalFooter className="flex-column align-items-stretch gap-2">
          {mutError && <CAlert color="danger" className="mb-0 py-2 small">{mutError}</CAlert>}
          <div className="d-flex justify-content-end gap-2">
            <CButton color="secondary" onClick={() => { setModal(false); setMutError('') }}>Cancel</CButton>
            <CButton
              color="primary" onClick={handleSave}
              disabled={isSaving || !form.effectiveFrom}
            >
              {isSaving ? <CSpinner size="sm" /> : editId ? 'Save Changes' : 'Create'}
            </CButton>
          </div>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default PolicySettings
