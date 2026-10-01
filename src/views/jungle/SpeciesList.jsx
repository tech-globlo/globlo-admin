import React, { useState } from 'react'
import { useSearchParamsState } from '../../hooks/useSearchParamState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert,
  CFormSelect, CFormInput, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormLabel, CFormCheck, CListGroup, CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilZoomIn } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'

const TAXON_COLORS = {
  MAMMAL: 'warning', BIRD: 'info', REPTILE: 'success',
  AMPHIBIAN: 'teal', INSECT: 'secondary', OTHER: 'secondary',
}

const IUCN_COLORS = { CR: 'danger', EN: 'danger', VU: 'warning', NT: 'info', LC: 'success', DD: 'secondary' }

const IUCN_LABELS = {
  EX: 'Extinct', EW: 'Extinct in Wild', CR: 'Critically Endangered',
  EN: 'Endangered', VU: 'Vulnerable', NT: 'Near Threatened',
  LC: 'Least Concern', DD: 'Data Deficient', NE: 'Not Evaluated',
}

const InfoRow = ({ label, value }) => (
  <CListGroupItem className="d-flex justify-content-between align-items-start py-2 px-0 border-start-0 border-end-0">
    <span className="text-muted small" style={{ minWidth: 130 }}>{label}</span>
    <span className="small fw-semibold text-end" style={{ maxWidth: '60%', wordBreak: 'break-word' }}>{value ?? '-'}</span>
  </CListGroupItem>
)

const fetchSpecies = async ({ limit, offset, search, taxonGroup, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (search) params.set('search', search)
  if (taxonGroup) params.set('taxonGroup', taxonGroup)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/species?${params}`)
  return res.data.data
}

const EMPTY_FORM = {
  commonName: '', scientificName: '', taxonGroup: 'MAMMAL',
  family: '', iucnStatus: '', imageUrl: '',
  aliases: '', regions: '', isVulnerable: false, searchRank: 0,
}

const SpeciesList = () => {
  const qc = useQueryClient()
  const [filters, setFilters] = useSearchParamsState({
    page: { default: 1, type: 'number' },
    pageSize: { default: 20, type: 'number' },
    search: { default: '' },
    taxonGroup: { default: '' },
    sortBy: { default: '' },
    sortOrder: { default: 'desc' },
  })
  const { page, pageSize, search, taxonGroup, sortBy, sortOrder } = filters
  // Typing buffer only — not URL-synced itself, it initializes from the
  // already-persisted `search` value below so it's still correct on
  // remount, without needing to sync every keystroke to the URL.
  const [searchInput, setSearchInput] = useState(search)
  const [editModal, setEditModal] = useState(false)
  const [detailModal, setDetailModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const offset = (page - 1) * pageSize

  const handleSort = (field, order) => { setFilters({ sortBy: field, sortOrder: order, page: 1 }) }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-species', { page, pageSize, search, taxonGroup, sortBy, sortOrder }],
    queryFn: () => fetchSpecies({ limit: pageSize, offset, search, taxonGroup, sortBy, sortOrder }),
    placeholderData: (prev) => prev,
  })

  const saveMut = useMutation({
    mutationFn: (payload) => editing
      ? api.patch(`/api/admin/species/${editing.id}`, payload)
      : api.post('/api/admin/species', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-species'] }); setEditModal(false) },
  })

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setEditModal(true) }

  const openEdit = (sp) => {
    setEditing(sp)
    setForm({
      commonName: sp.commonName || '', scientificName: sp.scientificName || '',
      taxonGroup: sp.taxonGroup || 'MAMMAL', family: sp.family || '',
      iucnStatus: sp.iucnStatus || '', imageUrl: sp.imageUrl || '',
      aliases: (sp.aliases || []).join(', '), regions: (sp.regions || []).join(', '),
      isVulnerable: sp.isVulnerable || false, searchRank: sp.searchRank || 0,
    })
    setDetailModal(false)
    setEditModal(true)
  }

  const openDetail = (sp) => { setViewing(sp); setDetailModal(true) }

  const handleSave = () => {
    const payload = {
      ...form,
      aliases: form.aliases ? form.aliases.split(',').map((s) => s.trim()).filter(Boolean) : [],
      regions: form.regions ? form.regions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      searchRank: parseInt(form.searchRank) || 0,
    }
    if (!payload.scientificName) delete payload.scientificName
    if (!payload.family) delete payload.family
    if (!payload.iucnStatus) delete payload.iucnStatus
    if (!payload.imageUrl) delete payload.imageUrl
    saveMut.mutate(payload)
  }

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <div>
            <strong>Species</strong>

          </div>
          <CButton size="sm" color="primary" onClick={openNew}>+ Add Species</CButton>
        </CCardHeader>
        <CCardBody>
          <CRow className="mb-3 g-2">
            <CCol md={4}>
              <CFormInput
                size="sm" placeholder="Search name."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setFilters({ search: searchInput, page: 1 }) }}
              />
            </CCol>
            <CCol md={3}>
              <CFormSelect size="sm" value={taxonGroup} onChange={(e) => setFilters({ taxonGroup: e.target.value, page: 1 })}>
                <option value="">All groups</option>
                {['MAMMAL','BIRD','REPTILE','AMPHIBIAN','INSECT','OTHER'].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>

          {isLoading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
          {isError && <CAlert color="danger">Failed to load species.</CAlert>}

          {data && (
            <>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                    <SortableHeader field="commonName" label="Common Name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <CTableHeaderCell>Scientific Name</CTableHeaderCell>
                    <SortableHeader field="taxonGroup" label="Group" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <SortableHeader field="iucnStatus" label="IUCN" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <CTableHeaderCell>Vulnerable</CTableHeaderCell>
                    <SortableHeader field="sightings" label="Sightings" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <SortableHeader field="searchRank" label="Rank" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <CTableHeaderCell>Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {data.species.map((sp, idx) => (
                    <CTableRow key={sp.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(sp)}>
                      <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                      <CTableDataCell className="small fw-semibold">{sp.commonName}</CTableDataCell>
                      <CTableDataCell className="small text-muted fst-italic">{sp.scientificName || '-'}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={TAXON_COLORS[sp.taxonGroup] || 'secondary'}>{sp.taxonGroup}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        {sp.iucnStatus
                          ? <CBadge color={IUCN_COLORS[sp.iucnStatus] || 'secondary'}>{sp.iucnStatus}</CBadge>
                          : '-'}
                      </CTableDataCell>
                      <CTableDataCell>
                        {sp.isVulnerable && <CBadge color="danger">Vulnerable</CBadge>}
                      </CTableDataCell>
                      <CTableDataCell className="small text-center">{sp._count?.sightings || 0}</CTableDataCell>
                      <CTableDataCell className="small">{sp.searchRank}</CTableDataCell>
                      <CTableDataCell onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex gap-1">
                          <CButton size="sm" color="outline-secondary" title="View details" onClick={() => openDetail(sp)}>
                            <CIcon icon={cilZoomIn} size="sm" />
                          </CButton>
                          <CButton size="sm" color="outline-primary" title="Edit" onClick={() => openEdit(sp)}>
                            <CIcon icon={cilPencil} size="sm" />
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
                onPageChange={(p) => setFilters({ page: p })}
                onPageSizeChange={(s) => setFilters({ pageSize: s, page: 1 })}
              />
            </>
          )}
        </CCardBody>
      </CCard>

      {/* Detail Modal */}
      {viewing && (
        <CModal visible={detailModal} onClose={() => setDetailModal(false)} size="lg">
          <CModalHeader>
            <CModalTitle>{viewing.commonName}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CRow className="g-3">
              {/* Image column */}
              <CCol md={4}>
                <div
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
                    background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {viewing.imageUrl ? (
                    <img
                      src={viewing.imageUrl}
                      alt={viewing.commonName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <span className="text-muted small">No image</span>
                  )}
                </div>

                <div className="mt-3 d-flex flex-wrap gap-1">
                  <CBadge color={TAXON_COLORS[viewing.taxonGroup] || 'secondary'} className="px-2 py-1">
                    {viewing.taxonGroup}
                  </CBadge>
                  {viewing.iucnStatus && (
                    <CBadge color={IUCN_COLORS[viewing.iucnStatus] || 'secondary'} className="px-2 py-1">
                      {viewing.iucnStatus} - {IUCN_LABELS[viewing.iucnStatus] || viewing.iucnStatus}
                    </CBadge>
                  )}
                  {viewing.isVulnerable && (
                    <CBadge color="danger" className="px-2 py-1">Vulnerable</CBadge>
                  )}
                </div>

                <div className="mt-3 text-center bg-body-secondary rounded p-2">
                  <div className="fw-bold fs-5">{viewing._count?.sightings || 0}</div>
                  <div className="small text-muted">Sightings</div>
                </div>
              </CCol>

              {/* Info column */}
              <CCol md={8}>
                <CListGroup flush>
                  <InfoRow label="Common Name" value={viewing.commonName} />
                  <InfoRow label="Scientific Name" value={viewing.scientificName} />
                  <InfoRow label="Family" value={viewing.family} />
                  <InfoRow label="Taxon Group" value={viewing.taxonGroup} />
                  <InfoRow label="IUCN Status" value={
                    viewing.iucnStatus
                      ? `${viewing.iucnStatus} - ${IUCN_LABELS[viewing.iucnStatus] || ''}`
                      : '-'
                  } />
                  <InfoRow label="Search Rank" value={viewing.searchRank} />
                </CListGroup>

                {viewing.aliases?.length > 0 && (
                  <div className="mt-3">
                    <div className="small fw-semibold text-muted mb-1">Also Known As</div>
                    <div className="d-flex flex-wrap gap-1">
                      {viewing.aliases.map((a) => (
                        <CBadge key={a} color="light" textColor="dark" className="border">{a}</CBadge>
                      ))}
                    </div>
                  </div>
                )}

                {viewing.regions?.length > 0 && (
                  <div className="mt-3">
                    <div className="small fw-semibold text-muted mb-1">Regions</div>
                    <div className="d-flex flex-wrap gap-1">
                      {viewing.regions.map((r) => (
                        <CBadge key={r} color="light" textColor="dark" className="border">{r}</CBadge>
                      ))}
                    </div>
                  </div>
                )}

                {viewing.imageUrl && (
                  <div className="mt-3">
                    <div className="small fw-semibold text-muted mb-1">Image URL</div>
                    <div className="small text-muted font-monospace" style={{ wordBreak: 'break-all' }}>
                      {viewing.imageUrl}
                    </div>
                  </div>
                )}
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setDetailModal(false)}>Close</CButton>
            <CButton color="primary" onClick={() => openEdit(viewing)}>
              <CIcon icon={cilPencil} size="sm" className="me-1" />Edit
            </CButton>
          </CModalFooter>
        </CModal>
      )}

      {/* Edit / Add Modal */}
      <CModal visible={editModal} onClose={() => setEditModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>{editing ? 'Edit Species' : 'Add Species'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel className="small">Common Name *</CFormLabel>
                <CFormInput size="sm" value={form.commonName} onChange={(e) => setForm({ ...form, commonName: e.target.value })} />
              </CCol>
              <CCol md={6}>
                <CFormLabel className="small">Scientific Name</CFormLabel>
                <CFormInput size="sm" value={form.scientificName} onChange={(e) => setForm({ ...form, scientificName: e.target.value })} />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="small">Taxon Group *</CFormLabel>
                <CFormSelect size="sm" value={form.taxonGroup} onChange={(e) => setForm({ ...form, taxonGroup: e.target.value })}>
                  {['MAMMAL','BIRD','REPTILE','AMPHIBIAN','INSECT','OTHER'].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel className="small">Family</CFormLabel>
                <CFormInput size="sm" value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })} />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="small">IUCN Status</CFormLabel>
                <CFormSelect size="sm" value={form.iucnStatus} onChange={(e) => setForm({ ...form, iucnStatus: e.target.value })}>
                  <option value="">-</option>
                  {['EX','EW','CR','EN','VU','NT','LC','DD','NE'].map((s) => <option key={s} value={s}>{s} - {IUCN_LABELS[s]}</option>)}
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <CFormLabel className="small">Aliases (comma-separated)</CFormLabel>
                <CFormInput size="sm" value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} placeholder="Tiger, Royal Bengal." />
              </CCol>
              <CCol md={6}>
                <CFormLabel className="small">Regions (comma-separated)</CFormLabel>
                <CFormInput size="sm" value={form.regions} onChange={(e) => setForm({ ...form, regions: e.target.value })} placeholder="India, Nepal." />
              </CCol>
              <CCol md={9}>
                <CFormLabel className="small">Image URL</CFormLabel>
                <CFormInput size="sm" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              </CCol>
              <CCol md={3}>
                <CFormLabel className="small">Search Rank</CFormLabel>
                <CFormInput size="sm" type="number" value={form.searchRank} onChange={(e) => setForm({ ...form, searchRank: e.target.value })} />
              </CCol>
              <CCol md={12}>
                <CFormCheck
                  label="Vulnerable species (location fuzzing enabled)"
                  checked={form.isVulnerable}
                  onChange={(e) => setForm({ ...form, isVulnerable: e.target.checked })}
                />
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setEditModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleSave} disabled={saveMut.isLoading || !form.commonName}>
            {saveMut.isLoading ? <CSpinner size="sm" /> : 'Save'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default SpeciesList
