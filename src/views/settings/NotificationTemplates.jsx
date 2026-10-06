import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert, CFormInput,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormLabel, CFormSelect, CFormTextarea, CFormCheck,
} from '@coreui/react'
import { fmtDateTime } from '../../lib/dateUtils'
import api from '../../lib/api'

const ALL_ROLES    = ['PHOTOGRAPHER', 'SERVICE_PROVIDER', 'TRIP_MANAGER', 'ADMIN']
const ALL_CHANNELS = ['IN_APP', 'EMAIL', 'WHATSAPP', 'SMS']

const CHANNEL_COLOR = { IN_APP: 'primary', EMAIL: 'info', WHATSAPP: 'success', SMS: 'warning' }
const ROLE_COLOR    = { PHOTOGRAPHER: 'secondary', SERVICE_PROVIDER: 'info', TRIP_MANAGER: 'primary', ADMIN: 'danger' }

const EMPTY_FORM = {
  name: '', eventType: '', titleTemplate: '', bodyTemplate: '',
  userRole: [], channels: [], actionButtons: '', isActive: true, priority: '1',
}

const NotificationTemplates = () => {
  const qc = useQueryClient()
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [editId, setEditId]   = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [success, setSuccess] = useState('')
  const [mutError, setMutError] = useState('')
  const [jsonError, setJsonError] = useState(null)

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000) }
  const f = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const toggleArr = (key, val) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter((x) => x !== val) : [...prev[key], val],
    }))

  const validateJson = (val) => {
    if (!val || val.trim() === '') { setJsonError(null); return }
    try { JSON.parse(val); setJsonError(null) }
    catch { setJsonError('Invalid JSON') }
  }

  const { data: templates, isLoading, isError } = useQuery({
    queryKey: ['admin-notification-templates', search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      return api.get(`/api/admin/notification-templates?${params}`).then((r) => r.data.data)
    },
  })

  const openCreate = () => {
    setEditId(null); setForm(EMPTY_FORM); setMutError(''); setJsonError(null); setModal(true)
  }

  const openEdit = (t) => {
    setEditId(t.id)
    setForm({
      name:          t.name,
      eventType:     t.eventType,
      titleTemplate: t.titleTemplate,
      bodyTemplate:  t.bodyTemplate,
      userRole:      t.userRole ?? [],
      channels:      t.channels ?? [],
      actionButtons: t.actionButtons ? JSON.stringify(t.actionButtons, null, 2) : '',
      isActive:      t.isActive,
      priority:      String(t.priority ?? 1),
    })
    setMutError(''); setJsonError(null); setModal(true)
  }

  const buildPayload = () => ({
    name:          form.name,
    eventType:     form.eventType,
    titleTemplate: form.titleTemplate,
    bodyTemplate:  form.bodyTemplate,
    userRole:      form.userRole,
    channels:      form.channels,
    isActive:      form.isActive,
    priority:      parseInt(form.priority, 10) || 1,
    actionButtons: form.actionButtons.trim() ? JSON.parse(form.actionButtons) : undefined,
  })

  const createMut = useMutation({
    mutationFn: (payload) => api.post('/api/admin/notification-templates', payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-notification-templates'] })
      setModal(false); flash('Template created.')
    },
    onError: (err) => setMutError(err?.response?.data?.message || 'Failed to create template.'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/api/admin/notification-templates/${id}`, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-notification-templates'] })
      setModal(false); flash('Template updated.')
    },
    onError: (err) => setMutError(err?.response?.data?.message || 'Failed to update template.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/notification-templates/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-notification-templates'] })
      flash('Template deleted.')
    },
    onError: (err) => setMutError(err?.response?.data?.message || 'Failed to delete template.'),
  })

  const handleSave = () => {
    if (jsonError) { setMutError('Fix JSON error in Action Buttons before saving.'); return }
    const payload = buildPayload()
    if (editId) updateMut.mutate({ id: editId, payload })
    else createMut.mutate(payload)
  }

  const isSaving = createMut.isPending || updateMut.isPending
  const canSave = form.name && form.eventType && form.titleTemplate && form.bodyTemplate && form.channels.length > 0

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Notification Templates</strong>
          <CButton size="sm" color="primary" onClick={openCreate}>+ New Template</CButton>
        </CCardHeader>
        <CCardBody>
          {success  && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}
          {mutError && !modal && <CAlert color="danger" dismissible onClose={() => setMutError('')}>{mutError}</CAlert>}

          <CFormInput
            size="sm" placeholder="Search name or event type-"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="mb-3" style={{ maxWidth: 320 }}
          />

          {isLoading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
          {isError   && <CAlert color="danger">Failed to load templates.</CAlert>}

          {templates && templates.length === 0 && (
            <div className="text-muted small text-center py-3">No notification templates found.</div>
          )}

          {templates && templates.length > 0 && (
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 40 }}>#</CTableHeaderCell>
                  <CTableHeaderCell>Name</CTableHeaderCell>
                  <CTableHeaderCell>Event Type</CTableHeaderCell>
                  <CTableHeaderCell>Channels</CTableHeaderCell>
                  <CTableHeaderCell>Roles</CTableHeaderCell>
                  <CTableHeaderCell>Priority</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Updated</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {templates.map((t, idx) => (
                  <CTableRow key={t.id}>
                    <CTableDataCell className="small text-muted">{idx + 1}</CTableDataCell>
                    <CTableDataCell className="small fw-semibold">{t.name}</CTableDataCell>
                    <CTableDataCell>
                      <code className="small">{t.eventType}</code>
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex flex-wrap gap-1">
                        {(t.channels ?? []).map((ch) => (
                          <CBadge key={ch} color={CHANNEL_COLOR[ch] ?? 'secondary'}>{ch}</CBadge>
                        ))}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex flex-wrap gap-1">
                        {(t.userRole ?? []).map((r) => (
                          <CBadge key={r} color={ROLE_COLOR[r] ?? 'secondary'} className="small">
                            {r.replace(/_/g, ' ')}
                          </CBadge>
                        ))}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell className="small">{t.priority}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={t.isActive ? 'success' : 'secondary'}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="small text-muted">{fmtDateTime(t.updatedAt)}</CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex gap-1">
                        <CButton size="sm" color="outline-primary" onClick={() => openEdit(t)}>Edit</CButton>
                        <CButton
                          size="sm" color="outline-danger"
                          disabled={deleteMut.isPending && deleteMut.variables === t.id}
                          onClick={() => { if (window.confirm(`Delete template "${t.name}"?`)) deleteMut.mutate(t.id) }}
                        >
                          {deleteMut.isPending && deleteMut.variables === t.id ? <CSpinner size="sm" /> : 'Del'}
                        </CButton>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      <CModal size="lg" visible={modal} onClose={() => { setModal(false); setMutError('') }}>
        <CModalHeader>
          <CModalTitle>{editId ? 'Edit' : 'New'} Notification Template</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">

            <div className="row g-3">
              <div className="col-md-6">
                <CFormLabel className="small">Name * <span className="text-muted fw-normal">(unique identifier)</span></CFormLabel>
                <CFormInput size="sm" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="e.g. TRIP_BOOKING_CONFIRMED" />
              </div>
              <div className="col-md-6">
                <CFormLabel className="small">Event Type *</CFormLabel>
                <CFormInput size="sm" value={form.eventType} onChange={(e) => f('eventType', e.target.value)} placeholder="e.g. BOOKING_CONFIRMED" />
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-9">
                <CFormLabel className="small">Title Template * <span className="text-muted fw-normal">use {`{{variable}}`} for placeholders</span></CFormLabel>
                <CFormInput size="sm" value={form.titleTemplate} onChange={(e) => f('titleTemplate', e.target.value)} placeholder="e.g. Your booking for {{trip_name}} is confirmed!" />
              </div>
              <div className="col-md-3">
                <CFormLabel className="small">Priority</CFormLabel>
                <CFormInput size="sm" type="number" min="1" value={form.priority} onChange={(e) => f('priority', e.target.value)} />
              </div>
            </div>

            <div>
              <CFormLabel className="small">Body Template *</CFormLabel>
              <CFormTextarea size="sm" rows={3} value={form.bodyTemplate} onChange={(e) => f('bodyTemplate', e.target.value)} placeholder="e.g. Hi {{user_name}}, your trip starts on {{start_date}}." />
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <CFormLabel className="small">Channels *</CFormLabel>
                <div className="d-flex flex-wrap gap-3 mt-1">
                  {ALL_CHANNELS.map((ch) => (
                    <CFormCheck
                      key={ch} id={`ch-${ch}`} label={ch}
                      checked={form.channels.includes(ch)}
                      onChange={() => toggleArr('channels', ch)}
                    />
                  ))}
                </div>
              </div>
              <div className="col-md-6">
                <CFormLabel className="small">Target Roles</CFormLabel>
                <div className="d-flex flex-wrap gap-3 mt-1">
                  {ALL_ROLES.map((r) => (
                    <CFormCheck
                      key={r} id={`role-${r}`} label={r.replace(/_/g, ' ')}
                      checked={form.userRole.includes(r)}
                      onChange={() => toggleArr('userRole', r)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <CFormLabel className="small">Action Buttons (JSON, optional)</CFormLabel>
              <CFormTextarea
                size="sm" rows={3}
                value={form.actionButtons}
                onChange={(e) => { f('actionButtons', e.target.value); validateJson(e.target.value) }}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
                placeholder={`[{"label":"View Trip","action":"OPEN_TRIP","data":{"tripId":"{{trip_id}}"}}]`}
              />
              {jsonError && <div className="text-danger small mt-1">{jsonError}</div>}
            </div>

            <div>
              <CFormCheck
                id="isActive" label="Active (template will be used for new notifications)"
                checked={form.isActive}
                onChange={(e) => f('isActive', e.target.checked)}
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
    </>
  )
}

export default NotificationTemplates
