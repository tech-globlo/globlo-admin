import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CTab, CTabContent, CTabList, CTabPanel, CTabs,
  CFormInput, CFormSelect, CFormTextarea, CFormLabel,
  CButton, CSpinner, CAlert, CBadge,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
} from '@coreui/react'
import api from '../../lib/api'
import { fmtDateTime } from '../../lib/dateUtils'

// How long to keep polling a sent test event before giving up and telling
// the admin to check manually. The worker polls every ~10s, so a few cycles
// covers a normal send; a slow/failed one just times out here, not for ever.
const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 30000

function NotificationsTab() {
  const [eventTypes, setEventTypes] = useState([])
  const [loadingEventTypes, setLoadingEventTypes] = useState(true)
  const [eventType, setEventType] = useState('')
  const [userId, setUserId] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [metadataText, setMetadataText] = useState('{}')
  const [metadataTouched, setMetadataTouched] = useState(false)
  const [metadataError, setMetadataError] = useState(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [result, setResult] = useState(null) // { status, lastError, resolvedToNothing, notifications }
  const [polling, setPolling] = useState(false)
  const pollTimer = useRef(null)
  const pollDeadline = useRef(0)

  useEffect(() => {
    let cancelled = false
    api.get('/api/admin/test/notifications/event-types').then((res) => {
      if (cancelled) return
      setEventTypes(res.data.data.eventTypes)
      if (res.data.data.eventTypes.length > 0) setEventType(res.data.data.eventTypes[0].eventType)
    }).finally(() => { if (!cancelled) setLoadingEventTypes(false) })
    return () => { cancelled = true }
  }, [])

  // Stop polling on unmount so a left-open tab doesn't keep hitting the API.
  useEffect(() => () => { if (pollTimer.current) clearTimeout(pollTimer.current) }, [])

  const selected = useMemo(
    () => eventTypes.find((e) => e.eventType === eventType),
    [eventTypes, eventType],
  )

  // Auto-fill the metadata box with a verified sample when the event type
  // changes, but only while the admin hasn't typed their own values in yet —
  // never clobber an in-progress edit.
  useEffect(() => {
    if (metadataTouched) return
    if (selected?.sampleMetadata) {
      setMetadataText(JSON.stringify(selected.sampleMetadata, null, 2))
    } else {
      setMetadataText('{}')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType])

  const pollOnce = async (eventId) => {
    try {
      // Cache-busting query param — admin GETs are cached 60s server-side by
      // path, so polling the same URL would otherwise freeze on the first hit.
      const res = await api.get(`/api/admin/test/notifications/${eventId}?t=${Date.now()}`)
      const data = res.data.data
      setResult(data)
      const finished = data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'EXPIRED'
      if (finished || Date.now() > pollDeadline.current) {
        setPolling(false)
        return
      }
      pollTimer.current = setTimeout(() => pollOnce(eventId), POLL_INTERVAL_MS)
    } catch (err) {
      setPolling(false)
      setSendError(err?.response?.data?.message || 'Lost track of the test event — check it manually.')
    }
  }

  const handleSend = async () => {
    setSendError(null)
    setMetadataError(null)
    setResult(null)
    if (!eventType || !userId.trim()) {
      setSendError('Choose an event type and enter a test user id.')
      return
    }
    let metadata = {}
    if (metadataText.trim()) {
      try {
        metadata = JSON.parse(metadataText)
      } catch (e) {
        setMetadataError('Metadata must be valid JSON.')
        return
      }
    }
    setSending(true)
    try {
      const res = await api.post('/api/admin/test/notifications/enqueue', {
        eventType,
        userId: userId.trim(),
        recipientEmail: recipientEmail.trim() || undefined,
        recipientPhone: recipientPhone.trim() || undefined,
        metadata,
      })
      const eventId = res.data.data.eventId
      setResult({ status: 'PENDING', notifications: [] })
      setPolling(true)
      pollDeadline.current = Date.now() + POLL_TIMEOUT_MS
      pollOnce(eventId)
    } catch (err) {
      setSendError(err?.response?.data?.message || 'Failed to enqueue the test notification.')
    } finally {
      setSending(false)
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <strong>Notifications</strong>
        <span className="ms-2 text-muted small">
          Sends through the real notificationQueue.enqueue() pipeline — the exact path every live notification uses
        </span>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3 mb-3">
          <CCol md={4}>
            <CFormLabel className="small fw-semibold">Event type</CFormLabel>
            <CFormSelect
              size="sm"
              value={eventType}
              onChange={(e) => { setEventType(e.target.value); setMetadataTouched(false) }}
              disabled={loadingEventTypes}
            >
              {eventTypes.map((e) => (
                <option key={e.eventType} value={e.eventType}>{e.eventType}</option>
              ))}
            </CFormSelect>
            {selected && (
              <div className="small text-muted mt-1">
                Channels mapped: {selected.email ? <CBadge color="info" className="me-1">Email</CBadge> : null}
                {selected.whatsapp ? <CBadge color="success">WhatsApp</CBadge> : null}
                {!selected.email && !selected.whatsapp ? 'None (in-app only, or no template wired)' : null}
              </div>
            )}
          </CCol>
          <CCol md={4}>
            <CFormLabel className="small fw-semibold">Test user id</CFormLabel>
            <CFormInput
              size="sm"
              placeholder="A real User.id — drives in-app/push and the fallback email/phone"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </CCol>
          <CCol md={4} />
          <CCol md={4}>
            <CFormLabel className="small fw-semibold">Override email (optional)</CFormLabel>
            <CFormInput
              size="sm"
              placeholder="Send the email here instead of the user's own"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel className="small fw-semibold">Override phone (optional)</CFormLabel>
            <CFormInput
              size="sm"
              placeholder="+91..."
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
            />
          </CCol>
        </CRow>

        <div className="d-flex align-items-baseline justify-content-between">
          <CFormLabel className="small fw-semibold">Metadata (JSON)</CFormLabel>
          {selected?.sampleMetadata && (
            <CButton
              size="sm"
              color="link"
              className="p-0 small"
              onClick={() => { setMetadataText(JSON.stringify(selected.sampleMetadata, null, 2)); setMetadataTouched(false) }}
            >
              Reset to sample
            </CButton>
          )}
        </div>
        {selected && (selected.emailFields?.length > 0 || selected.whatsappFields?.length > 0) && (
          <div className="small text-muted mb-1">
            Template fields (reference only — the metadata key the sender actually reads may be
            named differently, e.g. camelCase):
            {selected.emailFields?.length > 0 && (
              <span className="ms-1">email: <code>{selected.emailFields.join(', ')}</code></span>
            )}
            {selected.whatsappFields?.length > 0 && (
              <span className="ms-1">whatsapp: <code>{selected.whatsappFields.join(', ')}</code></span>
            )}
          </div>
        )}
        {!selected?.sampleMetadata && (
          <div className="small text-muted mb-1">
            No verified sample for this event type yet — leaving this as <code>{'{}'}</code> is fine,
            it just means any fields that depend on metadata won&apos;t be filled in.
          </div>
        )}
        <CFormTextarea
          rows={4}
          size="sm"
          value={metadataText}
          onChange={(e) => { setMetadataText(e.target.value); setMetadataTouched(true) }}
          style={{ fontFamily: 'monospace', fontSize: 13 }}
        />
        {metadataError && <div className="small text-danger mt-1">{metadataError}</div>}

        <div className="mt-3">
          <CButton size="sm" color="primary" onClick={handleSend} disabled={sending || polling}>
            {sending ? <CSpinner size="sm" /> : 'Send test'}
          </CButton>
        </div>

        {sendError && (
          <CAlert color="danger" className="mt-3" dismissible onClose={() => setSendError(null)}>
            {sendError}
          </CAlert>
        )}

        {result && (
          <div className="mt-3 p-3 border rounded bg-light">
            <div className="d-flex align-items-center gap-2 mb-2">
              <strong className="small">Result:</strong>
              <CBadge color={result.status === 'COMPLETED' ? 'success' : result.status === 'FAILED' ? 'danger' : 'warning'}>
                {result.status}
              </CBadge>
              {polling && <CSpinner size="sm" />}
            </div>

            {result.resolvedToNothing && (
              <CAlert color="warning" className="small mb-2">
                Event completed but produced zero channel sends — the template resolver likely has no case for
                this event type (same bug class as the earlier ACCOUNT_CREATED_CREDENTIALS gap).
              </CAlert>
            )}
            {result.lastError && (
              <div className="small text-danger mb-2">Error: {result.lastError}</div>
            )}

            {result.notifications && result.notifications.length > 0 && (
              <CTable small bordered className="mb-0 bg-white">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Channel</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Sent</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {result.notifications.map((n, i) => (
                    <CTableRow key={i}>
                      <CTableDataCell>{n.channel}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={n.status === 'SENT' || n.status === 'DELIVERED' ? 'success' : n.status === 'FAILED' ? 'danger' : 'secondary'}>
                          {n.status}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small text-muted">{n.sentAt ? fmtDateTime(n.sentAt) : '—'}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

const AMOUNT_OPTIONS_PAISE = [100, 200, 500, 1000]

function RazorpayPayoutsPanel() {
  const [userId, setUserId] = useState('')
  const [amountPaise, setAmountPaise] = useState(100)
  const [busy, setBusy] = useState(null) // which action is in flight
  const [error, setError] = useState(null)
  const [kyc, setKyc] = useState(null)
  const [lastPayout, setLastPayout] = useState(null)

  const run = async (key, fn) => {
    setError(null)
    setBusy(key)
    try {
      await fn()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Request failed.')
    } finally {
      setBusy(null)
    }
  }

  const checkKyc = () => run('kyc', async () => {
    if (!userId.trim()) { setError('Enter a test user id first.'); return }
    const res = await api.get(`/api/admin/test/payouts/kyc/${userId.trim()}?t=${Date.now()}`)
    setKyc(res.data.data)
  })

  const sendTransfer = () => run('transfer', async () => {
    if (!userId.trim()) { setError('Enter a test user id first.'); return }
    const res = await api.post('/api/admin/test/payouts/transfer', { userId: userId.trim(), amountPaise })
    setLastPayout(res.data.data)
  })

  const sendPaymentTransfer = () => run('payment-transfer', async () => {
    if (!userId.trim()) { setError('Enter a test user id first.'); return }
    const res = await api.post('/api/admin/test/payouts/payment-transfer', { userId: userId.trim(), amountPaise })
    setLastPayout(res.data.data)
  })

  const sendFundAccount = () => run('fund-account', async () => {
    if (!userId.trim()) { setError('Enter a test user id first.'); return }
    const res = await api.post('/api/admin/test/payouts/fund-account', { userId: userId.trim(), amountPaise })
    setLastPayout(res.data.data)
  })

  const deleteLastPayout = () => run('delete', async () => {
    if (!lastPayout?.payoutId) return
    await api.delete(`/api/admin/test/payouts/${lastPayout.payoutId}`)
    setLastPayout(null)
  })

  return (
    <>
      <div className="small text-muted mb-3">
        Real Razorpay calls against the test user&apos;s linked account — moved from the mobile test screen
      </div>
      <CRow className="g-3 mb-3">
          <CCol md={5}>
            <CFormLabel className="small fw-semibold">Test user id</CFormLabel>
            <CFormInput
              size="sm"
              placeholder="A User.id with a linked Razorpay account / verified payout method"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel className="small fw-semibold">Amount</CFormLabel>
            <CFormSelect size="sm" value={amountPaise} onChange={(e) => setAmountPaise(Number(e.target.value))}>
              {AMOUNT_OPTIONS_PAISE.map((p) => (
                <option key={p} value={p}>₹{p / 100}</option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={3} className="d-flex align-items-end">
            <CButton size="sm" color="secondary" variant="outline" onClick={checkKyc} disabled={!!busy}>
              {busy === 'kyc' ? <CSpinner size="sm" /> : 'Check KYC'}
            </CButton>
          </CCol>
        </CRow>

        {kyc && (
          <div className="small mb-3 p-2 border rounded bg-light">
            Account: {kyc.accountId} &middot; KYC: <CBadge color="info">{kyc.kycStatus}</CBadge> &middot;
            {' '}Active: {kyc.isActive ? 'Yes' : 'No'} &middot; Onboard: {kyc.onboardStatus}
          </div>
        )}

        <div className="d-flex flex-wrap gap-2 mb-3">
          <CButton size="sm" color="primary" onClick={sendTransfer} disabled={!!busy}>
            {busy === 'transfer' ? <CSpinner size="sm" /> : 'Send Direct Transfer'}
          </CButton>
          <CButton size="sm" color="primary" variant="outline" onClick={sendPaymentTransfer} disabled={!!busy}>
            {busy === 'payment-transfer' ? <CSpinner size="sm" /> : 'Send Payment-Linked Transfer'}
          </CButton>
          <CButton size="sm" color="primary" variant="outline" onClick={sendFundAccount} disabled={!!busy}>
            {busy === 'fund-account' ? <CSpinner size="sm" /> : 'Send Fund Account Payout'}
          </CButton>
        </div>

        {error && <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>}

        {lastPayout && (
          <div className="p-3 border rounded bg-light small">
            <div className="fw-semibold mb-1">Last test result</div>
            {Object.entries(lastPayout).map(([k, v]) => (
              <div key={k} className="text-muted">{k}: {String(v)}</div>
            ))}
            <CButton
              size="sm"
              color="danger"
              variant="outline"
              className="mt-2"
              onClick={deleteLastPayout}
              disabled={!!busy}
            >
              {busy === 'delete' ? <CSpinner size="sm" /> : 'Delete Test Record'}
            </CButton>
          </div>
        )}
    </>
  )
}

function IdfcPayoutsPanel() {
  const [userId, setUserId] = useState('')
  const [amountPaise, setAmountPaise] = useState(100)
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [beneficiaryName, setBeneficiaryName] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [balance, setBalance] = useState(null)
  const [validation, setValidation] = useState(null)
  const [lastPayout, setLastPayout] = useState(null)
  const [statusCheck, setStatusCheck] = useState(null)

  const run = async (key, fn) => {
    setError(null)
    setBusy(key)
    try {
      await fn()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Request failed.')
    } finally {
      setBusy(null)
    }
  }

  const checkBalance = () => run('balance', async () => {
    const res = await api.get(`/api/admin/test/payouts/idfc/balance?t=${Date.now()}`)
    setBalance(res.data.data)
  })

  const validateBeneficiary = () => run('validate', async () => {
    if (!accountNumber.trim() || !ifscCode.trim()) { setError('Enter account number and IFSC first.'); return }
    const res = await api.post('/api/admin/test/payouts/idfc/validate-beneficiary', {
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim(),
    })
    setValidation(res.data.data)
  })

  const sendPayout = () => run('payout', async () => {
    if (!userId.trim()) { setError('Enter a test user id first.'); return }
    if (!accountNumber.trim() || !ifscCode.trim()) { setError('Enter account number and IFSC first.'); return }
    setStatusCheck(null)
    const res = await api.post('/api/admin/test/payouts/idfc/payout', {
      userId: userId.trim(),
      amountPaise,
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim(),
      beneficiaryName: beneficiaryName.trim() || undefined,
    })
    setLastPayout(res.data.data)
  })

  const checkStatus = () => run('status', async () => {
    if (!lastPayout?.payoutId) return
    const res = await api.get(`/api/admin/test/payouts/idfc/status/${lastPayout.payoutId}?t=${Date.now()}`)
    setStatusCheck(res.data.data)
  })

  const deleteLastPayout = () => run('delete', async () => {
    if (!lastPayout?.payoutId) return
    await api.delete(`/api/admin/test/payouts/${lastPayout.payoutId}`)
    setLastPayout(null)
    setStatusCheck(null)
  })

  return (
    <>
      <div className="small text-muted mb-3">
        Real IDFC FIRST Bank calls (UAT). No PayoutMethod rows are gateway:&apos;idfc&apos; yet, so
        account number / IFSC are entered directly here rather than resolved from a saved payout method.
      </div>

      <div className="d-flex align-items-center gap-2 mb-3">
        <CButton size="sm" color="secondary" variant="outline" onClick={checkBalance} disabled={!!busy}>
          {busy === 'balance' ? <CSpinner size="sm" /> : 'Check Nodal Account Balance'}
        </CButton>
        {balance && (
          <span className="small text-muted">
            {balance.accountNumber}: ₹{balance.availableBalance} &middot; {balance.accountStatus}
          </span>
        )}
      </div>

      <CRow className="g-3 mb-3">
        <CCol md={3}>
          <CFormLabel className="small fw-semibold">Test user id</CFormLabel>
          <CFormInput size="sm" placeholder="Recipient User.id" value={userId} onChange={(e) => setUserId(e.target.value)} />
        </CCol>
        <CCol md={3}>
          <CFormLabel className="small fw-semibold">Beneficiary account number</CFormLabel>
          <CFormInput size="sm" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        </CCol>
        <CCol md={2}>
          <CFormLabel className="small fw-semibold">IFSC</CFormLabel>
          <CFormInput size="sm" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
        </CCol>
        <CCol md={2}>
          <CFormLabel className="small fw-semibold">Beneficiary name</CFormLabel>
          <CFormInput size="sm" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} />
        </CCol>
        <CCol md={2}>
          <CFormLabel className="small fw-semibold">Amount</CFormLabel>
          <CFormSelect size="sm" value={amountPaise} onChange={(e) => setAmountPaise(Number(e.target.value))}>
            {AMOUNT_OPTIONS_PAISE.map((p) => (
              <option key={p} value={p}>₹{p / 100}</option>
            ))}
          </CFormSelect>
        </CCol>
      </CRow>

      {validation && (
        <div className="small mb-3 p-2 border rounded bg-light">
          Valid: <CBadge color={validation.valid ? 'success' : 'danger'}>{String(validation.valid)}</CBadge>
          {' '}&middot; Identifier: {validation.identifierUsed || '—'} &middot; Bank-returned name: {validation.beneficiaryNameReturned || '—'}
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 mb-3">
        <CButton size="sm" color="secondary" variant="outline" onClick={validateBeneficiary} disabled={!!busy}>
          {busy === 'validate' ? <CSpinner size="sm" /> : 'Validate Beneficiary'}
        </CButton>
        <CButton size="sm" color="primary" onClick={sendPayout} disabled={!!busy}>
          {busy === 'payout' ? <CSpinner size="sm" /> : 'Send IDFC Payout'}
        </CButton>
      </div>

      {error && <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>}

      {lastPayout && (
        <div className="p-3 border rounded bg-light small">
          <div className="fw-semibold mb-1">Last test result</div>
          {Object.entries(lastPayout).map(([k, v]) => (
            <div key={k} className="text-muted">{k}: {String(v)}</div>
          ))}
          {lastPayout.needsStatusPoll && (
            <div className="small text-warning mt-1">
              Ambiguous response — left in PROCESSING. The idfc-status-poll cron will resolve it,
              or check now manually below.
            </div>
          )}
          <div className="d-flex gap-2 mt-2">
            <CButton size="sm" color="secondary" variant="outline" onClick={checkStatus} disabled={!!busy}>
              {busy === 'status' ? <CSpinner size="sm" /> : 'Check Status Now'}
            </CButton>
            <CButton size="sm" color="danger" variant="outline" onClick={deleteLastPayout} disabled={!!busy}>
              {busy === 'delete' ? <CSpinner size="sm" /> : 'Delete Test Record'}
            </CButton>
          </div>
          {statusCheck && (
            <div className="mt-2 p-2 border rounded bg-white">
              {Object.entries(statusCheck).filter(([k]) => k !== 'raw').map(([k, v]) => (
                <div key={k} className="text-muted">{k}: {String(v)}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function PayoutsTab() {
  const [rail, setRail] = useState('razorpay')
  return (
    <CCard>
      <CCardHeader>
        <strong>Payouts</strong>
        <div className="d-flex gap-2 mt-2">
          <CButton size="sm" color={rail === 'razorpay' ? 'primary' : 'secondary'} variant={rail === 'razorpay' ? undefined : 'outline'} onClick={() => setRail('razorpay')}>
            Razorpay
          </CButton>
          <CButton size="sm" color={rail === 'idfc' ? 'primary' : 'secondary'} variant={rail === 'idfc' ? undefined : 'outline'} onClick={() => setRail('idfc')}>
            IDFC
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        {rail === 'razorpay' ? <RazorpayPayoutsPanel /> : <IdfcPayoutsPanel />}
      </CCardBody>
    </CCard>
  )
}

function PushTab() {
  const [fcmToken, setFcmToken] = useState('')
  const [title, setTitle] = useState('Test push')
  const [body, setBody] = useState('Hello from the admin Test Area')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const send = async () => {
    setError(null)
    setResult(null)
    if (!fcmToken.trim()) { setError('Paste a device token first — copy it from the app, or from DeviceToken in the DB.'); return }
    setSending(true)
    try {
      // Uses the existing /api/notifications/test-fcm route directly — it's
      // a standalone dev endpoint, not part of the admin REST surface.
      const res = await api.post('/api/notifications/test-fcm', { fcmToken: fcmToken.trim(), title, body })
      setResult(res.data)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to send test push.')
    } finally {
      setSending(false)
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <strong>Push</strong>
        <span className="ms-2 text-muted small">
          Confirming delivery still needs a phone with the app installed and that token
        </span>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3 mb-3">
          <CCol md={6}>
            <CFormLabel className="small fw-semibold">Device (FCM/Expo) token</CFormLabel>
            <CFormInput size="sm" value={fcmToken} onChange={(e) => setFcmToken(e.target.value)} placeholder="ExponentPushToken[...] or FCM token" />
          </CCol>
          <CCol md={3}>
            <CFormLabel className="small fw-semibold">Title</CFormLabel>
            <CFormInput size="sm" value={title} onChange={(e) => setTitle(e.target.value)} />
          </CCol>
          <CCol md={3}>
            <CFormLabel className="small fw-semibold">Body</CFormLabel>
            <CFormInput size="sm" value={body} onChange={(e) => setBody(e.target.value)} />
          </CCol>
        </CRow>
        <CButton size="sm" color="primary" onClick={send} disabled={sending}>
          {sending ? <CSpinner size="sm" /> : 'Send test push'}
        </CButton>
        {error && <CAlert color="danger" className="mt-3" dismissible onClose={() => setError(null)}>{error}</CAlert>}
        {result && (
          <pre className="small mt-3 p-2 border rounded bg-light" style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </CCardBody>
    </CCard>
  )
}

const TestArea = () => {
  const [tab, setTab] = useState('notifications')

  return (
    <CTabs activeItemKey={tab} onChange={setTab}>
      <CTabList variant="tabs" className="mb-3">
        <CTab itemKey="notifications">Notifications</CTab>
        <CTab itemKey="payouts">Payouts</CTab>
        <CTab itemKey="push">Push</CTab>
      </CTabList>
      <CTabContent>
        <CTabPanel itemKey="notifications">
          <NotificationsTab />
        </CTabPanel>
        <CTabPanel itemKey="payouts">
          <PayoutsTab />
        </CTabPanel>
        <CTabPanel itemKey="push">
          <PushTab />
        </CTabPanel>
      </CTabContent>
    </CTabs>
  )
}

export default TestArea
