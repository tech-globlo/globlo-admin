import React from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CFormInput, CFormLabel,
  CButton, CSpinner, CAlert,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilSync } from '@coreui/icons'
import api from '../../lib/api'

// Bank wants DD/MM/YYYY — native <input type="date"> gives YYYY-MM-DD, convert both ways.
const toBankDate = (isoDate) => {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

const todayIso = () => new Date().toISOString().slice(0, 10)
const daysAgoIso = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const IdfcAccountStatement = () => {
  const [fromIso, setFromIso] = React.useState(daysAgoIso(30))
  const [toIso, setToIso] = React.useState(todayIso())
  const [error, setError] = React.useState(null)

  const fetchMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get('/api/admin/finance/idfc-account-statement', {
        params: { fromDate: toBankDate(fromIso), toDate: toBankDate(toIso) },
      })
      return res.data.data
    },
    onError: (err) => setError(err?.response?.data?.message || 'Failed to fetch statement.'),
    onSuccess: () => setError(null),
  })

  const pdfMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get('/api/admin/finance/idfc-account-statement/pdf', {
        params: { fromDate: toBankDate(fromIso), toDate: toBankDate(toIso) },
      })
      return res.data.data
    },
    onSuccess: (data) => window.open(data.url, '_blank'),
    onError: (err) => setError(err?.response?.data?.message || 'Failed to generate PDF.'),
  })

  // Live balance check — on demand only, not fetched on page load. Moved
  // here from Financial Overview, which previously auto-fetched this on
  // every page visit even though it's a real external bank call.
  const balanceMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get('/api/admin/finance/idfc-nodal-balance')
      return res.data.data
    },
    onError: (err) => setError(err?.response?.data?.message || 'Failed to check balance.'),
    onSuccess: () => setError(null),
  })
  const balance = balanceMutation.data

  const handleFetch = () => {
    setError(null)
    fetchMutation.mutate()
  }

  const statement = fetchMutation.data

  return (
    <CCard>
      <CCardHeader>
        <strong>IDFC Account Statement</strong>
        <span className="ms-2 text-muted small">
          Live, read-only — pulled directly from the bank for the chosen date range
        </span>
      </CCardHeader>
      <CCardBody>
        <div className="d-flex align-items-center gap-2 mb-3">
          <CButton size="sm" color="secondary" variant="outline" onClick={() => balanceMutation.mutate()} disabled={balanceMutation.isPending}>
            {balanceMutation.isPending ? <CSpinner size="sm" /> : (<><CIcon icon={cilSync} className="me-1" size="sm" />Check Live Balance</>)}
          </CButton>
          {balance && (
            balance.configured ? (
              <span className="small text-muted">
                <span className="fw-semibold text-dark">₹{Number(balance.availableBalance || 0).toLocaleString('en-IN')}</span>
                {' '}&middot; {balance.accountNumber} &middot; {balance.accountStatus}
              </span>
            ) : (
              <span className="small text-muted">IDFC not configured yet — see .env</span>
            )
          )}
        </div>

        <CRow className="g-3 mb-3 align-items-end">
          <CCol md={3}>
            <CFormLabel className="small fw-semibold">From</CFormLabel>
            <CFormInput size="sm" type="date" value={fromIso} onChange={(e) => setFromIso(e.target.value)} />
          </CCol>
          <CCol md={3}>
            <CFormLabel className="small fw-semibold">To</CFormLabel>
            <CFormInput size="sm" type="date" value={toIso} onChange={(e) => setToIso(e.target.value)} />
          </CCol>
          <CCol md={3}>
            <CButton size="sm" color="primary" onClick={handleFetch} disabled={fetchMutation.isPending}>
              {fetchMutation.isPending ? <CSpinner size="sm" /> : 'Fetch Statement'}
            </CButton>
          </CCol>
          <CCol md={3} className="text-md-end">
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={() => pdfMutation.mutate()}
              disabled={!statement || pdfMutation.isPending}
            >
              {pdfMutation.isPending ? <CSpinner size="sm" /> : (<><CIcon icon={cilCloudDownload} className="me-1" size="sm" />Export as PDF</>)}
            </CButton>
          </CCol>
        </CRow>

        {error && <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>}

        {statement && (
          <>
            <div className="small text-muted mb-3">
              Account: <span className="font-monospace">{statement.accountNumber || '—'}</span>
              {statement.accountName && <> &middot; {statement.accountName}</>}
              &middot; {statement.transactions.length} transaction{statement.transactions.length === 1 ? '' : 's'}
            </div>

            {statement.transactions.length === 0 ? (
              <div className="text-center py-4 text-muted small">No transactions found for this period.</div>
            ) : (
              <CTable small hover responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>Description</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Debit</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Credit</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Balance</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {statement.transactions.map((t, i) => {
                    const isDebit = (t.amountIndicator || '').toUpperCase() === 'DR'
                    return (
                      <CTableRow key={i}>
                        <CTableDataCell className="small text-muted">{t.postDate || t.valueDate || '—'}</CTableDataCell>
                        <CTableDataCell className="small">{t.description || '—'}</CTableDataCell>
                        <CTableDataCell className="small text-end text-danger">{isDebit ? t.amount : '—'}</CTableDataCell>
                        <CTableDataCell className="small text-end text-success">{!isDebit ? t.amount : '—'}</CTableDataCell>
                        <CTableDataCell className="small text-end fw-semibold">{t.balance || '—'}</CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            )}
          </>
        )}

        {!statement && !fetchMutation.isPending && (
          <div className="text-center py-4 text-muted small">Pick a date range and fetch to see transactions.</div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default IdfcAccountStatement
