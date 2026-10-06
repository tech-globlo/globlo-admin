import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CBadge,
  CButton,
  CSpinner,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CFormCheck,
  CFormInput,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPaperPlane, cilBell } from '@coreui/icons'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const STATUS_CONFIG = {
  OPEN:           { color: 'danger',    label: 'Open',           step: 0 },
  IN_PROGRESS:    { color: 'warning',   label: 'In Progress',    step: 1 },
  AWAITING_REPLY: { color: 'info',      label: 'Awaiting Reply', step: 2 },
  RESOLVED:       { color: 'success',   label: 'Resolved',       step: 3 },
  CLOSED:         { color: 'secondary', label: 'Closed',         step: 3 },
}
const STEPPER_STEPS = ['OPEN', 'IN_PROGRESS', 'AWAITING_REPLY', 'RESOLVED']
const PRIORITY_COLOR = { CRITICAL: 'danger', URGENT: 'warning', NORMAL: 'secondary' }

const StatusStepper = ({ current }) => {
  const currentStep = STATUS_CONFIG[current]?.step ?? 0
  return (
    <div className="d-flex align-items-center mb-4" style={{ overflowX: 'auto', paddingBottom: 4 }}>
      {STEPPER_STEPS.map((status, idx) => {
        const cfg = STATUS_CONFIG[status]
        const done = currentStep > idx
        const active = currentStep === idx
        return (
          <React.Fragment key={status}>
            <div className="d-flex flex-column align-items-center" style={{ minWidth: 72 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: done ? '#0d6efd' : active ? '#fff' : '#e9ecef',
                  border: active ? '2px solid #0d6efd' : done ? 'none' : '2px solid #dee2e6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: done ? '#fff' : active ? '#0d6efd' : '#adb5bd',
                  flexShrink: 0,
                }}
              >
                {done ? '✓' : idx + 1}
              </div>
              <div
                style={{
                  fontSize: 10,
                  marginTop: 5,
                  textAlign: 'center',
                  color: active ? '#0d6efd' : done ? '#495057' : '#adb5bd',
                  fontWeight: active ? 600 : 400,
                  lineHeight: 1.2,
                }}
              >
                {cfg.label}
              </div>
            </div>
            {idx < STEPPER_STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: done ? '#0d6efd' : '#e9ecef',
                  marginBottom: 22,
                  minWidth: 16,
                }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

const Avatar = ({ name, size = 28, bg = '#0d6efd' }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: bg,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.4,
      fontWeight: 700,
      flexShrink: 0,
    }}
  >
    {name?.[0]?.toUpperCase() || '?'}
  </div>
)

const CaseDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [statusModal, setStatusModal] = useState(false)
  const [form, setForm] = useState({ status: '', note: '', solution: '', publishToUser: false })
  const [reply, setReply] = useState({ message: '', publishToUser: true, status: '' })
  const [broadcastModal, setBroadcastModal] = useState(false)
  const defaultExpiry = () => {
    const d = new Date()
    d.setHours(d.getHours() + 24)
    return d.toISOString().slice(0, 16)
  }
  const [bcast, setBcast] = useState({
    title: '',
    message: '',
    priority: 'NORMAL',
    targetRole: '',
    targetService: '',
    expiresAt: defaultExpiry(),
  })
  const threadRef = useRef(null)

  const { data: c, isLoading, isError } = useQuery({
    queryKey: ['admin-case', id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/cases/${id}`)
      return res.data.data
    },
  })

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [c?.statusLog?.length])

  const updateMut = useMutation({
    mutationFn: (payload) => api.patch(`/api/admin/cases/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-case', id] })
      qc.invalidateQueries({ queryKey: ['admin-cases'] })
      setStatusModal(false)
    },
  })

  const replyMut = useMutation({
    mutationFn: (payload) => api.post(`/api/admin/cases/${id}/reply`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-case', id] })
      setReply({ message: '', publishToUser: true, status: '' })
    },
  })

  const broadcastMut = useMutation({
    mutationFn: (payload) => api.post(`/api/admin/cases/${id}/broadcast`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-case', id] })
      setBroadcastModal(false)
      setBcast((prev) => ({ ...prev, title: '', message: '', expiresAt: defaultExpiry() }))
    },
  })

  if (isLoading)
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  if (isError) return <CAlert color="danger">Failed to load case.</CAlert>
  if (!c) return null

  const statusCfg = STATUS_CONFIG[c.status] || { color: 'secondary', label: c.status }
  const thread = c.statusLog?.filter((l) => l.note || l.solution) || []

  return (
    <>
      <CButton color="secondary" size="sm" className="mb-3" onClick={() => navigate(-1)}>
        <CIcon icon={cilArrowLeft} size="sm" className="me-1" />
        Back
      </CButton>

      {/* Case header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <h5 className="mb-0">Case #{c.id.slice(-6).toUpperCase()}</h5>
          <CBadge color={statusCfg.color}>{statusCfg.label}</CBadge>
          <CBadge color={PRIORITY_COLOR[c.priority] || 'secondary'}>{c.priority}</CBadge>
        </div>
        <div className="d-flex gap-2">
          {c.trip && (
            <CButton
              size="sm"
              color="outline-warning"
              onClick={() => {
                setBcast((prev) => ({ ...prev, title: '', message: '', expiresAt: defaultExpiry() }))
                setBroadcastModal(true)
              }}
            >
              <CIcon icon={cilBell} size="sm" className="me-1" />
              Broadcast
            </CButton>
          )}
          <CButton
            size="sm"
            color="outline-primary"
            onClick={() => {
              setForm({ status: c.status, note: '', solution: '', publishToUser: false })
              setStatusModal(true)
            }}
          >
            Update Status
          </CButton>
        </div>
      </div>

      <CRow className="g-3">
        {/* Left: stepper + info */}
        <CCol md={7}>
          <CCard>
            <CCardBody>
              <StatusStepper current={c.status} />

              <CRow className="g-3 mb-3">
                <CCol xs={6}>
                  <div className="text-uppercase text-muted" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>Status</div>
                  <CBadge color={statusCfg.color} className="mt-1">{statusCfg.label}</CBadge>
                </CCol>
                <CCol xs={6}>
                  <div className="text-uppercase text-muted" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>Category</div>
                  <div className="small fw-semibold mt-1">{c.reason}</div>
                </CCol>
                <CCol xs={6}>
                  <div className="text-uppercase text-muted" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>Raised By</div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <Avatar name={c.raisedByUser?.name} size={24} bg="#6c757d" />
                    <div>
                      <div className="small fw-semibold">{c.raisedByUser?.name}</div>
                      <div className="small text-muted">{c.raisedByUser?.email}</div>
                    </div>
                  </div>
                </CCol>
                <CCol xs={6}>
                  <div className="text-uppercase text-muted" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>Trip</div>
                  {c.trip ? (
                    <Link to={`/trips/${c.trip.id}`} className="small fw-semibold mt-1 d-block">{c.trip.title}</Link>
                  ) : (
                    <div className="small text-muted mt-1">—</div>
                  )}
                </CCol>
                <CCol xs={6}>
                  <div className="text-uppercase text-muted" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>Priority</div>
                  <CBadge color={PRIORITY_COLOR[c.priority] || 'secondary'} className="mt-1">{c.priority}</CBadge>
                </CCol>
                <CCol xs={6}>
                  <div className="text-uppercase text-muted" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>Last Activity</div>
                  <div className="small mt-1">{fmtDateTime(c.updatedAt)}</div>
                </CCol>
                {c.resolvedAt && (
                  <CCol xs={6}>
                    <div className="text-uppercase text-muted" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>Resolved At</div>
                    <div className="small mt-1">{fmtDateTime(c.resolvedAt)}</div>
                  </CCol>
                )}
                <CCol xs={6}>
                  <div className="text-uppercase text-muted" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>Opened</div>
                  <div className="small mt-1">{fmtDate(c.createdAt)}</div>
                </CCol>
              </CRow>

              {c.description && (
                <div className="border-top pt-3">
                  <div className="text-uppercase text-muted mb-2" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>Description</div>
                  <div className="small" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.description}</div>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* Right: response thread */}
        <CCol md={5}>
          <CCard style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 }}>
            <CCardHeader className="py-2 d-flex align-items-center justify-content-between">
              <strong>Responses</strong>
              <CBadge color="secondary">{thread.length}</CBadge>
            </CCardHeader>

            {/* Thread */}
            <div
              ref={threadRef}
              style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', minHeight: 200, maxHeight: 420 }}
            >
              {thread.length === 0 && (
                <div className="text-center text-muted small py-5">No responses yet.</div>
              )}
              {thread.map((log) => (
                <div key={log.id} className="mb-3">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <Avatar name={log.actor?.name} size={26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="small fw-semibold">{log.actor?.name || 'Admin'}</span>
                      <span className="small text-muted ms-2">{fmtDateTime(log.createdAt)}</span>
                    </div>
                    {log.publishToUser && (
                      <CBadge color="info" style={{ fontSize: 9 }}>User visible</CBadge>
                    )}
                  </div>
                  <div
                    className="small rounded p-2"
                    style={{ background: '#f4f6f8', marginLeft: 34, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}
                  >
                    {log.note}
                    {log.solution && (
                      <div className="text-success mt-1">
                        <strong>Resolution:</strong> {log.solution}
                      </div>
                    )}
                  </div>
                  {log.fromStatus !== log.toStatus && (
                    <div className="small text-muted mt-1" style={{ marginLeft: 34, fontSize: 10 }}>
                      <CBadge color={STATUS_CONFIG[log.fromStatus]?.color || 'secondary'} style={{ fontSize: 9 }}>
                        {STATUS_CONFIG[log.fromStatus]?.label || log.fromStatus}
                      </CBadge>
                      <span className="mx-1">→</span>
                      <CBadge color={STATUS_CONFIG[log.toStatus]?.color || 'secondary'} style={{ fontSize: 9 }}>
                        {STATUS_CONFIG[log.toStatus]?.label || log.toStatus}
                      </CBadge>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Reply input */}
            <div style={{ borderTop: '1px solid #dee2e6', padding: '12px 16px' }}>
              <CFormTextarea
                size="sm"
                rows={3}
                placeholder="Write a response…"
                value={reply.message}
                onChange={(e) => setReply({ ...reply, message: e.target.value })}
                className="mb-2"
              />
              <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <CFormCheck
                    id="reply-visible"
                    label={<span className="small">Visible to user</span>}
                    checked={reply.publishToUser}
                    onChange={(e) => setReply({ ...reply, publishToUser: e.target.checked })}
                  />
                  <CFormSelect
                    size="sm"
                    style={{ width: 'auto', minWidth: 130, fontSize: 12 }}
                    value={reply.status}
                    onChange={(e) => setReply({ ...reply, status: e.target.value })}
                  >
                    <option value="">Keep status</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="AWAITING_REPLY">Awaiting Reply</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </CFormSelect>
                </div>
                <CButton
                  size="sm"
                  color="primary"
                  disabled={!reply.message.trim() || replyMut.isPending}
                  onClick={() =>
                    replyMut.mutate({
                      message: reply.message,
                      publishToUser: reply.publishToUser,
                      status: reply.status || undefined,
                    })
                  }
                >
                  {replyMut.isPending ? (
                    <CSpinner size="sm" />
                  ) : (
                    <>
                      <CIcon icon={cilPaperPlane} size="sm" className="me-1" />
                      Send
                    </>
                  )}
                </CButton>
              </div>
            </div>
          </CCard>
        </CCol>
      </CRow>

      {/* Update Status Modal */}
      <CModal visible={statusModal} onClose={() => setStatusModal(false)}>
        <CModalHeader>
          <CModalTitle>Update Case Status</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">
            <div>
              <CFormLabel className="small">Status</CFormLabel>
              <CFormSelect
                size="sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="AWAITING_REPLY">Awaiting Reply</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </CFormSelect>
            </div>
            <div>
              <CFormLabel className="small">Note (internal)</CFormLabel>
              <CFormTextarea
                size="sm"
                rows={2}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Admin note."
              />
            </div>
            {(form.status === 'RESOLVED' || form.status === 'CLOSED') && (
              <div>
                <CFormLabel className="small">Resolution detail</CFormLabel>
                <CFormTextarea
                  size="sm"
                  rows={2}
                  value={form.solution}
                  onChange={(e) => setForm({ ...form, solution: e.target.value })}
                  placeholder="Describe how the case was resolved."
                />
              </div>
            )}
            <CFormCheck
              label="Visible to user"
              checked={form.publishToUser}
              onChange={(e) => setForm({ ...form, publishToUser: e.target.checked })}
            />
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setStatusModal(false)}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={() => updateMut.mutate(form)}
            disabled={updateMut.isPending}
          >
            {updateMut.isPending ? <CSpinner size="sm" /> : 'Save'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Broadcast Modal */}
      <CModal size="lg" visible={broadcastModal} onClose={() => setBroadcastModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilBell} size="sm" className="me-2" />
            Create Broadcast
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {broadcastMut.isError && (
            <CAlert color="danger" className="small py-2">
              {broadcastMut.error?.response?.data?.message || 'Failed to create broadcast.'}
            </CAlert>
          )}
          <CForm className="d-flex flex-column gap-3">
            <CRow className="g-3">
              <CCol md={8}>
                <CFormLabel className="small fw-semibold">Title <span className="text-danger">*</span></CFormLabel>
                <CFormInput
                  size="sm"
                  value={bcast.title}
                  onChange={(e) => setBcast({ ...bcast, title: e.target.value })}
                  placeholder="Broadcast headline"
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="small fw-semibold">Priority</CFormLabel>
                <CFormSelect
                  size="sm"
                  value={bcast.priority}
                  onChange={(e) => setBcast({ ...bcast, priority: e.target.value })}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">Urgent</option>
                </CFormSelect>
              </CCol>
              <CCol xs={12}>
                <CFormLabel className="small fw-semibold">Message <span className="text-danger">*</span></CFormLabel>
                <CFormTextarea
                  size="sm"
                  rows={4}
                  value={bcast.message}
                  onChange={(e) => setBcast({ ...bcast, message: e.target.value })}
                  placeholder="Describe what you need from service providers…"
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="small fw-semibold">Target Role</CFormLabel>
                <CFormSelect
                  size="sm"
                  value={bcast.targetRole}
                  onChange={(e) => setBcast({ ...bcast, targetRole: e.target.value, targetService: '' })}
                >
                  <option value="">All roles</option>
                  <option value="SERVICE_PROVIDER">Service Provider</option>
                  <option value="PHOTOGRAPHER">Photographer</option>
                  <option value="TRIP_MANAGER">Trip Manager</option>
                </CFormSelect>
              </CCol>
              {bcast.targetRole === 'SERVICE_PROVIDER' && (
                <CCol md={4}>
                  <CFormLabel className="small fw-semibold">Target Service</CFormLabel>
                  <CFormSelect
                    size="sm"
                    value={bcast.targetService}
                    onChange={(e) => setBcast({ ...bcast, targetService: e.target.value })}
                  >
                    <option value="">All services</option>
                    <option value="DRIVER">Driver</option>
                    <option value="GUIDE">Guide</option>
                    <option value="HOMESTAY">Homestay</option>
                  </CFormSelect>
                </CCol>
              )}
              <CCol md={4}>
                <CFormLabel className="small fw-semibold">Expires At <span className="text-danger">*</span></CFormLabel>
                <CFormInput
                  type="datetime-local"
                  size="sm"
                  value={bcast.expiresAt}
                  onChange={(e) => setBcast({ ...bcast, expiresAt: e.target.value })}
                />
              </CCol>
            </CRow>
            <div className="p-2 rounded" style={{ background: '#fff8e1', fontSize: 12 }}>
              <strong>Trip:</strong> {c?.trip?.title} &nbsp;|&nbsp;
              <strong>Case:</strong> #{id?.slice(-6).toUpperCase()}
              <br />
              <span className="text-muted">
                This broadcast will be sent to eligible users on the trip and logged as a case activity.
              </span>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setBroadcastModal(false)}>
            Cancel
          </CButton>
          <CButton
            color="warning"
            disabled={!bcast.title.trim() || !bcast.message.trim() || !bcast.expiresAt || broadcastMut.isPending}
            onClick={() =>
              broadcastMut.mutate({
                title: bcast.title,
                message: bcast.message,
                priority: bcast.priority,
                targetRole: bcast.targetRole || undefined,
                targetService: bcast.targetService || undefined,
                expiresAt: new Date(bcast.expiresAt).toISOString(),
              })
            }
          >
            {broadcastMut.isPending ? <CSpinner size="sm" /> : (
              <><CIcon icon={cilBell} size="sm" className="me-1" />Send Broadcast</>
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default CaseDetail
