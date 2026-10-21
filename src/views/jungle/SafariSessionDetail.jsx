import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CBadge, CButton, CSpinner, CAlert, CListGroup, CListGroupItem,
} from '@coreui/react'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const STATUS_COLOR = { ACTIVE: 'success', ENDED: 'secondary', ABANDONED: 'warning' }

// Builds a Google Maps directions link from a GeoJSON LineString's
// coordinates — no map library/dependency needed just to let an admin open
// the recorded route externally.
const routeMapsUrl = (routeGeojson) => {
  const coords = routeGeojson?.coordinates
  if (!Array.isArray(coords) || coords.length === 0) return null
  // GeoJSON is [lng, lat]; Google Maps wants lat,lng.
  const points = coords.filter((c) => Array.isArray(c) && c.length >= 2)
  if (points.length === 0) return null
  const path = points.map(([lng, lat]) => `${lat},${lng}`).join('/')
  return `https://www.google.com/maps/dir/${path}`
}

const pointMapsUrl = (lat, lng) =>
  lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null

const SafariSessionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['admin-safari-session', id],
    queryFn: async () => {
      const res = await api.get(`/api/admin/safari-sessions/${id}`)
      return res.data.data
    },
  })

  if (isLoading) return <div className="text-center py-5"><CSpinner color="primary" /></div>
  if (isError) return <CAlert color="danger">Failed to load session.</CAlert>
  if (!session) return null

  return (
    <>
      <CButton color="secondary" size="sm" className="mb-3" onClick={() => navigate(-1)}>
        - Back
      </CButton>

      <CRow className="g-3">
        <CCol md={4}>
          <CCard>
            <CCardHeader><strong>Session Info</strong></CCardHeader>
            <CCardBody className="p-0">
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-muted small">Status</span>
                  <CBadge color={STATUS_COLOR[session.status] || 'secondary'}>{session.status}</CBadge>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-muted small">Started By</span>
                  <span className="small">{session.startedByUser?.name}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-muted small">Destination</span>
                  <span className="small">{session.destination?.name}</span>
                </CListGroupItem>
                {session.trip && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted small">Trip</span>
                    <span className="small">{session.trip.title}</span>
                  </CListGroupItem>
                )}
                {session.zone && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted small">Zone</span>
                    <span className="small">{session.zone}</span>
                  </CListGroupItem>
                )}
                {session.vehicleId && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted small">Vehicle</span>
                    <span className="small">{session.vehicleId}</span>
                  </CListGroupItem>
                )}
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-muted small">Start</span>
                  <span className="small">{fmtDateTime(session.startTime)}</span>
                </CListGroupItem>
                {session.endTime && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted small">End</span>
                    <span className="small">{fmtDateTime(session.endTime)}</span>
                  </CListGroupItem>
                )}
                {session.distanceMeters != null && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted small">Distance</span>
                    <span className="small">{(session.distanceMeters / 1000).toFixed(1)} km</span>
                  </CListGroupItem>
                )}
                {routeMapsUrl(session.routeGeojson) && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted small">GPS Track</span>
                    <a href={routeMapsUrl(session.routeGeojson)} target="_blank" rel="noreferrer" className="small">
                      View route ({session.routeGeojson.coordinates.length} points)
                    </a>
                  </CListGroupItem>
                )}
                <CListGroupItem>
                  <div className="text-muted small mb-1">
                    Participants ({session.participantUsers?.length ?? session.participants?.length ?? 0})
                  </div>
                  {session.participantUsers?.length > 0 ? (
                    <div className="small">
                      {session.participantUsers.map((u) => (
                        <div key={u.id}>{u.name || u.email || u.id}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="small text-muted">-</span>
                  )}
                </CListGroupItem>
                {session.weather && typeof session.weather === 'object' && (
                  <CListGroupItem>
                    <div className="text-muted small mb-1">Weather</div>
                    <div className="small">
                      {Object.entries(session.weather)
                        .filter(([, v]) => v != null && v !== '')
                        .map(([k, v]) => (
                          <div key={k}>
                            {k}: {String(v)}
                          </div>
                        ))}
                    </div>
                  </CListGroupItem>
                )}
                {session.notes && (
                  <CListGroupItem>
                    <div className="text-muted small mb-1">Notes</div>
                    <div className="small">{session.notes}</div>
                  </CListGroupItem>
                )}
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={8}>
          <CCard>
            <CCardHeader>
              <strong>Sightings</strong>
              <span className="ms-2 text-muted small">({session.sightings?.length || 0})</span>
            </CCardHeader>
            <CCardBody>
              {session.sightings?.length === 0 && (
                <p className="text-muted small mb-0">No sightings recorded.</p>
              )}
              {session.sightings?.length > 0 && (
                <CTable hover responsive small>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Species</CTableHeaderCell>
                      <CTableHeaderCell>Group</CTableHeaderCell>
                      <CTableHeaderCell>Count</CTableHeaderCell>
                      <CTableHeaderCell>Reporter</CTableHeaderCell>
                      <CTableHeaderCell>Location</CTableHeaderCell>
                      <CTableHeaderCell>Zone</CTableHeaderCell>
                      <CTableHeaderCell>Source</CTableHeaderCell>
                      <CTableHeaderCell>Confidence</CTableHeaderCell>
                      <CTableHeaderCell>Verified</CTableHeaderCell>
                      <CTableHeaderCell>Observed At</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {session.sightings.map((s) => (
                      <CTableRow key={s.id}>
                        <CTableDataCell className="small fw-semibold">
                          {s.species?.commonName || s.speciesText || '-'}
                          {s.notes && (
                            <div className="text-muted fw-normal mt-1" style={{ fontSize: 11 }}>
                              {s.notes}
                            </div>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {s.species?.taxonGroup && (
                            <CBadge color="light" textColor="dark">{s.species.taxonGroup}</CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="small">{s.count}</CTableDataCell>
                        <CTableDataCell className="small">
                          {s.reporter?.name || s.reporter?.email || s.reporterUserId}
                        </CTableDataCell>
                        <CTableDataCell className="small">
                          {pointMapsUrl(s.latitude, s.longitude) ? (
                            <a href={pointMapsUrl(s.latitude, s.longitude)} target="_blank" rel="noreferrer">
                              {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                            </a>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="small text-muted">{s.zone || '-'}</CTableDataCell>
                        <CTableDataCell className="small text-muted">{s.source}</CTableDataCell>
                        <CTableDataCell className="small">{s.confidence}%</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={s.isVerified ? 'success' : 'secondary'}>
                            {s.isVerified ? 'Yes' : 'No'}
                          </CBadge>
                          {s.isVerified && (s.verifiedBy || s.verifiedAt) && (
                            <div className="text-muted mt-1" style={{ fontSize: 10 }}>
                              {s.verifiedBy && s.verifiedBy !== 'SYSTEM_HEURISTIC' ? s.verifiedBy : 'System'}
                              {s.verifiedAt ? ` · ${fmtDateTime(s.verifiedAt)}` : ''}
                            </div>
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="small text-muted">
                          {fmtDateTime(s.observedAt)}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default SafariSessionDetail
