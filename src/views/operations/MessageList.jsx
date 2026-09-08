import React, { useState } from 'react'
import { useSearchParamsState } from '../../hooks/useSearchParamState'
import { useQuery } from '@tanstack/react-query'
import {
  CCard, CCardBody, CCardHeader,
  CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert, CFormSelect,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CListGroup, CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilZoomIn } from '@coreui/icons'
import SortableHeader from '../../components/SortableHeader'
import AdminTableFooter from '../../components/AdminTableFooter'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const fetchConversations = async ({ limit, offset, isGroup, sortBy, sortOrder }) => {
  const params = new URLSearchParams({ limit, offset })
  if (isGroup !== '') params.set('isGroup', isGroup)
  if (sortBy) params.set('sortBy', sortBy)
  if (sortOrder) params.set('sortOrder', sortOrder)
  const res = await api.get(`/api/admin/conversations?${params}`)
  return res.data.data
}

const MessageList = () => {
  const [filters, setFilters] = useSearchParamsState({
    page: { default: 1, type: 'number' },
    pageSize: { default: 20, type: 'number' },
    isGroup: { default: '' },
    sortBy: { default: 'lastMessageAt' },
    sortOrder: { default: 'desc' },
  })
  const { page, pageSize, isGroup, sortBy, sortOrder } = filters
  const [viewConv, setViewConv] = useState(null)
  const offset = (page - 1) * pageSize

  const handleSort = (field, order) => { setFilters({ sortBy: field, sortOrder: order, page: 1 }) }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-conversations', { page, pageSize, isGroup, sortBy, sortOrder }],
    queryFn: () => fetchConversations({ limit: pageSize, offset, isGroup, sortBy, sortOrder }),
    placeholderData: (prev) => prev,
  })

  const { data: convDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-conversation', viewConv],
    queryFn: async () => {
      const res = await api.get(`/api/admin/conversations/${viewConv}`)
      return res.data.data
    },
    enabled: !!viewConv,
  })

  return (
    <>
      <CCard>
        <CCardHeader>
          <strong>Conversations</strong>

        </CCardHeader>
        <CCardBody>
          <CRow className="mb-3 g-2">
            <CCol md={3}>
              <CFormSelect size="sm" value={isGroup} onChange={(e) => setFilters({ isGroup: e.target.value, page: 1 })}>
                <option value="">All types</option>
                <option value="true">Group chats</option>
                <option value="false">Direct messages</option>
              </CFormSelect>
            </CCol>
          </CRow>

          {isLoading && <div className="text-center py-4"><CSpinner color="primary" /></div>}
          {isError && <CAlert color="danger">Failed to load conversations.</CAlert>}

          {data && (
            <>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                    <CTableHeaderCell>Type</CTableHeaderCell>
                    <CTableHeaderCell>Name / Participants</CTableHeaderCell>
                    <CTableHeaderCell>Trip</CTableHeaderCell>
                    <SortableHeader field="messages" label="Messages" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <SortableHeader field="participants" label="Participants" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <SortableHeader field="lastMessageAt" label="Last Activity" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <CTableHeaderCell>Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {data.conversations.map((conv, idx) => (
                    <CTableRow key={conv.id}>
                      <CTableDataCell className="small text-muted">{offset + idx + 1}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={conv.isGroup ? 'primary' : 'secondary'}>
                          {conv.isGroup ? 'Group' : 'DM'}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        {conv.isGroup ? (
                          <div className="small fw-semibold">{conv.groupName || 'Unnamed group'}</div>
                        ) : (
                          <div className="small">
                            {conv.participants?.slice(0, 2).map((p) => p.user?.name).join(' — ') || '-'}
                          </div>
                        )}
                      </CTableDataCell>
                      <CTableDataCell className="small">{conv.trip?.title || '-'}</CTableDataCell>
                      <CTableDataCell className="small text-center">{conv._count?.messages || 0}</CTableDataCell>
                      <CTableDataCell className="small text-center">{conv._count?.participants || 0}</CTableDataCell>
                      <CTableDataCell className="small text-muted">{fmtDateTime(conv.lastMessageAt)}</CTableDataCell>
                      <CTableDataCell>
                        <CButton size="sm" color="outline-primary" title="View details" onClick={() => setViewConv(conv.id)}>
                          <CIcon icon={cilZoomIn} size="sm" />
                        </CButton>
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

      <CModal visible={!!viewConv} onClose={() => setViewConv(null)} size="lg">
        <CModalHeader>
          <CModalTitle>Conversation Details</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {detailLoading && <div className="text-center py-3"><CSpinner color="primary" /></div>}
          {convDetail && (
            <>
              <CRow className="g-3 mb-3">
                <CCol md={6}>
                  <CListGroup flush>
                    <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                      <span className="text-muted small">Type</span>
                      <CBadge color={convDetail.isGroup ? 'primary' : 'secondary'}>
                        {convDetail.isGroup ? 'Group' : 'Direct Message'}
                      </CBadge>
                    </CListGroupItem>
                    {convDetail.isGroup && (
                      <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                        <span className="text-muted small">Group Name</span>
                        <span className="small fw-semibold">{convDetail.groupName || 'Unnamed'}</span>
                      </CListGroupItem>
                    )}
                    <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                      <span className="text-muted small">Trip</span>
                      <span className="small">{convDetail.trip?.title || '-'}</span>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                      <span className="text-muted small">Total Messages</span>
                      <span className="small fw-semibold">{convDetail._count?.messages ?? 0}</span>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                      <span className="text-muted small">Last Activity</span>
                      <span className="small">{fmtDateTime(convDetail.lastMessageAt)}</span>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between py-2 px-0 border-start-0 border-end-0">
                      <span className="text-muted small">Created</span>
                      <span className="small">{fmtDate(convDetail.createdAt)}</span>
                    </CListGroupItem>
                  </CListGroup>
                </CCol>
              </CRow>

              <div className="small fw-semibold text-uppercase text-muted mb-2" style={{ letterSpacing: 1 }}>
                Participants ({convDetail._count?.participants ?? 0})
              </div>
              <CTable small hover responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>#</CTableHeaderCell>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Email</CTableHeaderCell>
                    <CTableHeaderCell>App Role</CTableHeaderCell>
                    <CTableHeaderCell>Conv Role</CTableHeaderCell>
                    <CTableHeaderCell>Last Read</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {convDetail.participants.map((p, i) => (
                    <CTableRow key={p.userId}>
                      <CTableDataCell className="small text-muted">{i + 1}</CTableDataCell>
                      <CTableDataCell className="small fw-semibold">{p.user?.name || '-'}</CTableDataCell>
                      <CTableDataCell className="small text-muted">{p.user?.email || '-'}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="light" textColor="dark">{p.user?.role || '-'}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small">{p.role || '-'}</CTableDataCell>
                      <CTableDataCell className="small text-muted">{fmtDateTime(p.lastReadAt)}</CTableDataCell>
                      <CTableDataCell>
                        {p.leftAt
                          ? <CBadge color="secondary">Left</CBadge>
                          : <CBadge color="success">Active</CBadge>}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setViewConv(null)}>Close</CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default MessageList
