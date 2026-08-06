import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard,
  CCardBody,
  CCardHeader,
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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
} from '@coreui/react'
import SortableHeader from '../../components/SortableHeader'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const fmtRate = (r) => `${(r * 100).toFixed(2)}%`

const TAX_KINDS = ['GST_ON_PLATFORM_FEE', 'GST_ON_TOUR_OPERATOR', 'TCS', 'CGST', 'SGST', 'IGST']

const EMPTY_FORM = {
  kind: 'GST_ON_PLATFORM_FEE',
  rate: '',
  liability: 'PLATFORM',
  appliesTo: 'ALL',
  effectiveFrom: '',
  effectiveUntil: '',
  notes: '',
}

const TaxSettings = () => {
  const qc = useQueryClient()
  const [sortBy, setSortBy] = useState('effectiveFrom')
  const [sortOrder, setSortOrder] = useState('desc')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [success, setSuccess] = useState('')
  const [mutError, setMutError] = useState('')

  const handleSort = (field, order) => {
    setSortBy(field)
    setSortOrder(order)
  }
  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  const {
    data: policies,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-tax-policies', { sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (sortBy) params.set('sortBy', sortBy)
      if (sortOrder) params.set('sortOrder', sortOrder)
      const res = await api.get(`/api/admin/tax-policies?${params}`)
      return res.data.data
    },
  })

  const createMut = useMutation({
    mutationFn: (payload) => api.post('/api/admin/tax-policies', payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-tax-policies'] })
      setModal(false)
      setForm(EMPTY_FORM)
      flash('Tax policy created successfully.')
    },
    onError: (err) => setMutError(err?.response?.data?.message || 'Failed to create policy.'),
  })

const handleSave = () => {
    const payload = {
      kind: form.kind,
      rate: parseFloat(form.rate) / 100,
      liability: form.liability,
      appliesTo: form.appliesTo,
      effectiveFrom: form.effectiveFrom,
      notes: form.notes || undefined,
    }
    if (form.effectiveUntil) payload.effectiveUntil = form.effectiveUntil
    createMut.mutate(payload)
  }

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <div>
            <strong>Tax Policies</strong>
            <div className="text-muted small mt-1">
              Activate a policy per kind when the GST rate changes.
            </div>
          </div>
          <CButton
            size="sm"
            color="primary"
            onClick={() => {
              setForm(EMPTY_FORM)
              setModal(true)
            }}
          >
            + New Policy
          </CButton>
        </CCardHeader>
        <CCardBody>
          {success && (
            <CAlert color="success" dismissible onClose={() => setSuccess('')}>
              {success}
            </CAlert>
          )}
          {isLoading && (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          )}
          {isError && <CAlert color="danger">Failed to load tax policies.</CAlert>}

          {policies && (
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <SortableHeader
                    field="kind"
                    label="Kind"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    field="rate"
                    label="Rate"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <CTableHeaderCell>Liability</CTableHeaderCell>
                  <CTableHeaderCell>Applies To</CTableHeaderCell>
                  <SortableHeader
                    field="effectiveFrom"
                    label="Effective From"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <CTableHeaderCell>Effective Until</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Notes</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {policies.map((p, idx) => {
                  const active = p.active
                  return (
                    <CTableRow key={p.id}>
                      <CTableDataCell className="small text-muted">{idx + 1}</CTableDataCell>
                      <CTableDataCell className="small fw-semibold">
                        {p.kind?.replace(/_/g, ' ')}
                      </CTableDataCell>
                      <CTableDataCell className="small">{fmtRate(p.rate)}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={p.liability === 'PLATFORM' ? 'primary' : 'warning'}>
                          {p.liability}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small">{p.appliesTo}</CTableDataCell>
                      <CTableDataCell className="small">{fmtDate(p.effectiveFrom)}</CTableDataCell>
                      <CTableDataCell className="small">{fmtDate(p.effectiveUntil)}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={active ? 'success' : 'secondary'}>
                          {active ? 'Active' : 'Not Active'}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small text-muted">{p.notes || '-'}</CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      <CModal
        visible={modal}
        onClose={() => {
          setModal(false)
          setMutError('')
        }}
      >
        <CModalHeader>
          <CModalTitle>New Tax Policy</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">
            <div>
              <CFormLabel className="small">Tax Kind *</CFormLabel>
              <CFormSelect
                size="sm"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                {TAX_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k.replace(/_/g, ' ')}
                  </option>
                ))}
              </CFormSelect>
            </div>
            <div>
              <CFormLabel className="small">Rate (%) *</CFormLabel>
              <CFormInput
                size="sm"
                type="number"
                step="0.01"
                placeholder="18.00"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
              />
            </div>
            <div>
              <CFormLabel className="small">Liability *</CFormLabel>
              <CFormSelect
                size="sm"
                value={form.liability}
                onChange={(e) => setForm({ ...form, liability: e.target.value })}
              >
                <option value="PLATFORM">Platform</option>
                <option value="SUPPLIER">Supplier</option>
              </CFormSelect>
            </div>
            <div>
              <CFormLabel className="small">Applies To *</CFormLabel>
              <CFormInput
                size="sm"
                placeholder="e.g. ALL or PLATFORM_FEE"
                value={form.appliesTo}
                onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}
              />
            </div>
            <div>
              <CFormLabel className="small">Effective From *</CFormLabel>
              <CFormInput
                size="sm"
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
              />
            </div>
            <div>
              <CFormLabel className="small">Effective Until (optional)</CFormLabel>
              <CFormInput
                size="sm"
                type="date"
                value={form.effectiveUntil}
                onChange={(e) => setForm({ ...form, effectiveUntil: e.target.value })}
              />
            </div>
            <div>
              <CFormLabel className="small">Notes</CFormLabel>
              <CFormInput
                size="sm"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter className="flex-column align-items-stretch gap-2">
          {mutError && (
            <CAlert color="danger" className="mb-0 py-2 small">
              {mutError}
            </CAlert>
          )}
          <div className="d-flex justify-content-end gap-2">
            <CButton
              color="secondary"
              onClick={() => {
                setModal(false)
                setMutError('')
              }}
            >
              Cancel
            </CButton>
            <CButton
              color="primary"
              onClick={handleSave}
              disabled={createMut.isLoading || !form.rate || !form.effectiveFrom || !form.appliesTo}
            >
              {createMut.isLoading ? <CSpinner size="sm" /> : 'Create'}
            </CButton>
          </div>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default TaxSettings
