import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  CSpinner,
  CAlert,
} from '@coreui/react'
import api from '../../lib/api'

const fetchTriggers = async () => {
  const res = await api.get('/api/admin/triggers')
  return res.data.data
}

const TriggerList = () => {
  const [expandedId, setExpandedId] = useState(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-triggers'],
    queryFn: fetchTriggers,
  })

  return (
    <CCard>
      <CCardHeader>
        <strong>Database Triggers</strong>
        <div className="small text-muted mt-1">
          Read-only view of active Postgres triggers (from pg_trigger). Click a row to see the
          full definition.
        </div>
      </CCardHeader>
      <CCardBody>
        {isLoading && (
          <div className="text-center py-4">
            <CSpinner color="primary" />
          </div>
        )}
        {isError && <CAlert color="danger">Failed to load triggers.</CAlert>}

        {data && (
          <>
            <div className="small text-muted mb-2">{data.total} trigger(s) found</div>
            <CTable hover responsive small>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 48 }}>Sr No</CTableHeaderCell>
                  <CTableHeaderCell>Trigger Name</CTableHeaderCell>
                  <CTableHeaderCell>Table</CTableHeaderCell>
                  <CTableHeaderCell>Timing</CTableHeaderCell>
                  <CTableHeaderCell>Event</CTableHeaderCell>
                  <CTableHeaderCell>Function</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.triggers.map((t, idx) => (
                  <React.Fragment key={t.triggerName + t.tableName}>
                    <CTableRow
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        setExpandedId(expandedId === idx ? null : idx)
                      }
                    >
                      <CTableDataCell className="small text-muted">{idx + 1}</CTableDataCell>
                      <CTableDataCell className="small fw-semibold">{t.triggerName}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="light" textColor="dark" className="border">
                          {t.tableName}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small text-muted">{t.timing}</CTableDataCell>
                      <CTableDataCell className="small">
                        {(t.events || '')
                          .split(', ')
                          .filter(Boolean)
                          .map((ev) => (
                            <CBadge key={ev} color="info" textColor="dark" className="me-1">
                              {ev}
                            </CBadge>
                          ))}
                      </CTableDataCell>
                      <CTableDataCell className="small text-muted">{t.functionName}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={t.isEnabled ? 'success' : 'secondary'}>
                          {t.isEnabled ? 'Enabled' : 'Disabled'}
                        </CBadge>
                      </CTableDataCell>
                    </CTableRow>
                    {expandedId === idx && (
                      <CTableRow>
                        <CTableDataCell colSpan={7} style={{ background: 'var(--cui-tertiary-bg)' }}>
                          <div className="small text-muted fw-semibold mt-1 mb-1">Trigger definition</div>
                          <div
                            className="small"
                            style={{
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              padding: '8px 4px',
                            }}
                          >
                            {t.definition}
                          </div>
                          <div className="small text-muted fw-semibold mt-2 mb-1">
                            Function body ({t.functionName})
                          </div>
                          <div
                            className="small"
                            style={{
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              padding: '8px 4px',
                            }}
                          >
                            {t.functionDefinition}
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </React.Fragment>
                ))}
              </CTableBody>
            </CTable>

            {data.triggers.length === 0 && (
              <div className="text-center py-4 text-muted small">No triggers found.</div>
            )}
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default TriggerList
