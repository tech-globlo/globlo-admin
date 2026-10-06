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

const EMPTY_FORM = {
  rate: '',
  effectiveFrom: '',
  effectiveUntil: '',
  appliesTo: 'ALL_TRANSACTIONS',
  notes: '',
}

const PlatformFeeSettings = () => {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [sortBy, setSortBy] = useState('effectiveFrom')
  const [sortOrder, setSortOrder] = useState('desc')
  const [success, setSuccess] = useState('')
  const [mutError, setMutError] = useState('')

  const handleSort = (field, order) => {
    setSortBy(field)
    setSortOrder(order)
  }

  const {
    data: configs,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-platform-fees', { sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (sortBy) params.set('sortBy', sortBy)
      if (sortOrder) params.set('sortOrder', sortOrder)
      const res = await api.get(`/api/admin/platform-fee-configs?${params}`)
      return res.data.data
    },
  })

  const createMut = useMutation({
    mutationFn: (payload) => api.post('/api/admin/platform-fee-configs', payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-platform-fees'] })
      setModal(false)
      setForm(EMPTY_FORM)
      setSuccess('Platform fee config created successfully.')
      setTimeout(() => setSuccess(''), 4000)
    },
    onError: (err) => {
      setMutError(err?.response?.data?.message || 'Failed to create config.')
    },
  })

  const activateMut = useMutation({
    mutationFn: (id) => api.patch(`/api/admin/platform-fee-configs/${id}/activate`, {}),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-platform-fees'] })
      setSuccess('Policy activated. Previous active policy deactivated.')
      setTimeout(() => setSuccess(''), 4000)
    },
    onError: (err) => {
      setSuccess('')
      setMutError(err?.response?.data?.message || 'Failed to activate policy.')
      setTimeout(() => setMutError(''), 4000)
    },
  })

  const handleSave = () => {
    const payload = {
      rate: parseFloat(form.rate) / 100,
      effectiveFrom: form.effectiveFrom,
      appliesTo: form.appliesTo,
      notes: form.notes || undefined,
    }
    if (form.effectiveUntil) payload.effectiveUntil = form.effectiveUntil
    createMut.mutate(payload)
  }

  const now = new Date()
  const isActive = (cfg) => {
    const from = new Date(cfg.effectiveFrom)
    const until = cfg.effectiveUntil ? new Date(cfg.effectiveUntil) : null
    return from <= now && (!until || until >= now)
  }

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Platform Fee Configurations</strong>
          <CButton
            size="sm"
            color="primary"
            onClick={() => {
              setForm(EMPTY_FORM)
              setModal(true)
            }}
          >
            + New Config
          </CButton>
        </CCardHeader>
        <CCardBody>
          {success && (
            <CAlert color="success" dismissible onClose={() => setSuccess('')}>
              {success}
            </CAlert>
          )}
          {mutError && !modal && (
            <CAlert color="danger" dismissible onClose={() => setMutError('')}>
              {mutError}
            </CAlert>
          )}
          {isLoading && (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          )}
          {isError && <CAlert color="danger">Failed to load fee configs.</CAlert>}

          {configs && (
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <SortableHeader
                    field="rate"
                    label="Rate"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    field="appliesTo"
                    label="Applies To"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
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
                  <CTableHeaderCell>Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {configs.map((cfg, idx) => {
                  const active = isActive(cfg)
                  const activating = activateMut.isPending && activateMut.variables === cfg.id
                  return (
                    <CTableRow key={cfg.id}>
                      <CTableDataCell className="small text-muted">{idx + 1}</CTableDataCell>
                      <CTableDataCell className="fw-semibold">{fmtRate(cfg.rate)}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="light" textColor="dark">
                          {cfg.appliesTo?.replace(/_/g, ' ')}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small">
                        {fmtDate(cfg.effectiveFrom)}
                      </CTableDataCell>
                      <CTableDataCell className="small">
                        {fmtDate(cfg.effectiveUntil)}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={active ? 'success' : 'secondary'}>
                          {active ? 'Active' : 'Not Active'}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small text-muted">
                        {cfg.notes || '-'}
                      </CTableDataCell>
                      <CTableDataCell>
                        {active ? (
                          <CBadge color="success" className="small">
                            Current
                          </CBadge>
                        ) : (
                          <CButton
                            size="sm"
                            color="outline-success"
                            disabled={activateMut.isPending}
                            onClick={() => activateMut.mutate(cfg.id)}
                          >
                            {activating ? <CSpinner size="sm" /> : 'Set Active'}
                          </CButton>
                        )}
                      </CTableDataCell>
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
          <CModalTitle>New Platform Fee Config</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm className="d-flex flex-column gap-3">
            <div>
              <CFormLabel className="small">Rate (%) *</CFormLabel>
              <CFormInput
                size="sm"
                type="number"
                step="0.01"
                placeholder="5.00"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
              />
            </div>
            <div>
              <CFormLabel className="small">Applies To *</CFormLabel>
              <CFormSelect
                size="sm"
                value={form.appliesTo}
                onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}
              >
                <option value="ALL_TRANSACTIONS">All Transactions</option>
                <option value="TRIP_BOOKING">Trip Booking</option>
                <option value="SP_BOOKING">SP Booking</option>
              </CFormSelect>
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
              disabled={createMut.isPending || !form.rate || !form.effectiveFrom}
            >
              {createMut.isPending ? <CSpinner size="sm" /> : 'Create'}
            </CButton>
          </div>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default PlatformFeeSettings
