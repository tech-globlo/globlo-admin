﻿import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CFormInput,
  CFormTextarea,
  CFormSelect,
  CFormCheck,
  CButton,
  CSpinner,
  CAlert,
} from '@coreui/react'
import api from '../../lib/api'

const fetchDestination = async (id) => {
  const res = await api.get(`/api/destinations/${id}`)
  return res.data.data || res.data
}

// photographyFriendly is stored as a JSON-encoded string: { level, compositions?, recommendedGear?, tip? }.
// Some legacy rows may still hold a bare level string ("High"/"Medium"/"Low") — fall back gracefully.
const parsePhotographyFriendly = (raw) => {
  if (!raw) return { level: 'Medium', compositions: [], recommendedGear: [], tip: '' }
  if (typeof raw === 'object') {
    return {
      level: raw.level || 'Medium',
      compositions: raw.compositions || [],
      recommendedGear: raw.recommendedGear || [],
      tip: raw.tip || '',
    }
  }
  try {
    const parsed = JSON.parse(raw)
    return {
      level: parsed.level || 'Medium',
      compositions: parsed.compositions || [],
      recommendedGear: parsed.recommendedGear || [],
      tip: parsed.tip || '',
    }
  } catch {
    return { level: raw, compositions: [], recommendedGear: [], tip: '' }
  }
}

// nearestPlaces rows are edited as { attractionName, attractionDescription, imagesText, latitude, longitude }
// and converted to/from the stored shape: { attractionName, attractionDescription, images: string[], latitude, longitude }
const toPlaceRows = (nearestPlaces) =>
  (nearestPlaces || []).map((p) => ({
    attractionName: p.attractionName || '',
    attractionDescription: p.attractionDescription || '',
    imagesText: (p.images || []).join(', '),
    latitude: p.latitude ?? '',
    longitude: p.longitude ?? '',
  }))

const fromPlaceRows = (rows) =>
  rows
    .filter((r) => r.attractionName.trim())
    .map((r) => ({
      attractionName: r.attractionName.trim(),
      attractionDescription: r.attractionDescription.trim() || undefined,
      images: r.imagesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      latitude: r.latitude !== '' ? parseFloat(r.latitude) : undefined,
      longitude: r.longitude !== '' ? parseFloat(r.longitude) : undefined,
    }))

const DestinationEdit = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = !id || id === 'new'
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)

  const { data: destination, isLoading } = useQuery({
    queryKey: ['admin-destination', id],
    queryFn: () => fetchDestination(id),
    enabled: !isNew,
    onSuccess: (d) => {
      if (!form)
        setForm({
          name: d.name || '',
          country: d.country || '',
          state: d.state || '',
          region: d.region || '',
          description: d.description || '',
          status: d.status || 'DRAFT',
          photographyLevel: parsePhotographyFriendly(d.photographyFriendly).level,
          photographyCompositions: parsePhotographyFriendly(d.photographyFriendly).compositions.join(', '),
          photographyRecommendedGear: parsePhotographyFriendly(d.photographyFriendly).recommendedGear.join(', '),
          photographyTip: parsePhotographyFriendly(d.photographyFriendly).tip,
          photographyPermits: d.photographyPermits || '',
          isPopular: d.isPopular || false,
          tags: (d.tags || []).join(', '),
          bestTimeToVisit: (d.bestTimeToVisit || []).join(', '),
          category: (d.category || []).join(', '),
          species: (d.species || []).join(', '),
          conservationStatus: (d.conservationStatus || []).join(', '),
          availableFeatures: (d.availableFeatures || []).join(', '),
          openTime: d.openTime || '',
          vehicleAccess: d.vehicleAccess || '',
          crowdLevel: d.crowdLevel || '',
          nearestPlaces: toPlaceRows(d.nearestPlaces),
          latitude: d.latitude || '',
          longitude: d.longitude || '',
        })
    },
  })

  const saveMut = useMutation({
    mutationFn: async (data) => {
      if (isNew) {
        return api.post('/api/admin/destinations', data)
      }
      return api.patch(`/api/admin/destinations/${id}`, data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-destinations'] })
      navigate('/destinations')
    },
    onError: (err) => setError(err.response?.data?.message || 'Save failed'),
  })

  const field = (key) => ({
    value: form?.[key] ?? '',
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  const addPlaceRow = () =>
    setForm((f) => ({
      ...f,
      nearestPlaces: [
        ...f.nearestPlaces,
        { attractionName: '', attractionDescription: '', imagesText: '', latitude: '', longitude: '' },
      ],
    }))

  const removePlaceRow = (index) =>
    setForm((f) => ({
      ...f,
      nearestPlaces: f.nearestPlaces.filter((_, i) => i !== index),
    }))

  const setPlaceRowField = (index, key, val) =>
    setForm((f) => ({
      ...f,
      nearestPlaces: f.nearestPlaces.map((row, i) => (i === index ? { ...row, [key]: val } : row)),
    }))

  const handleSave = () => {
    if (!form) return
    if (!form.name.trim() || !form.country.trim() || !form.description.trim()) {
      setError('Name, Country, and Description are required.')
      return
    }
    const {
      photographyLevel,
      photographyCompositions,
      photographyRecommendedGear,
      photographyTip,
      ...rest
    } = form
    const payload = {
      ...rest,
      photographyFriendly: JSON.stringify({
        level: photographyLevel,
        compositions: photographyCompositions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        recommendedGear: photographyRecommendedGear
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        tip: photographyTip || undefined,
      }),
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      bestTimeToVisit: form.bestTimeToVisit
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      category: form.category
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      species: form.species
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      conservationStatus: form.conservationStatus
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      availableFeatures: form.availableFeatures
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      photographyPermits: form.photographyPermits || undefined,
      openTime: form.openTime || undefined,
      vehicleAccess: form.vehicleAccess || undefined,
      crowdLevel: form.crowdLevel || undefined,
      nearestPlaces: fromPlaceRows(form.nearestPlaces),
      latitude: form.latitude ? parseFloat(form.latitude) : undefined,
      longitude: form.longitude ? parseFloat(form.longitude) : undefined,
    }
    saveMut.mutate(payload)
  }

  if (!isNew && isLoading)
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )

  if (!isNew && !form && destination) {
    setForm({
      name: destination.name || '',
      country: destination.country || '',
      state: destination.state || '',
      region: destination.region || '',
      description: destination.description || '',
      status: destination.status || 'DRAFT',
      photographyLevel: parsePhotographyFriendly(destination.photographyFriendly).level,
      photographyCompositions: parsePhotographyFriendly(destination.photographyFriendly).compositions.join(', '),
      photographyRecommendedGear: parsePhotographyFriendly(destination.photographyFriendly).recommendedGear.join(', '),
      photographyTip: parsePhotographyFriendly(destination.photographyFriendly).tip,
      photographyPermits: destination.photographyPermits || '',
      isPopular: destination.isPopular || false,
      tags: (destination.tags || []).join(', '),
      bestTimeToVisit: (destination.bestTimeToVisit || []).join(', '),
      category: (destination.category || []).join(', '),
      species: (destination.species || []).join(', '),
      conservationStatus: (destination.conservationStatus || []).join(', '),
      availableFeatures: (destination.availableFeatures || []).join(', '),
      openTime: destination.openTime || '',
      vehicleAccess: destination.vehicleAccess || '',
      crowdLevel: destination.crowdLevel || '',
      nearestPlaces: toPlaceRows(destination.nearestPlaces),
      latitude: destination.latitude || '',
      longitude: destination.longitude || '',
    })
  }

  if (!form && isNew) {
    setForm({
      name: '',
      country: '',
      state: '',
      region: '',
      description: '',
      status: 'DRAFT',
      photographyLevel: 'Medium',
      photographyCompositions: '',
      photographyRecommendedGear: '',
      photographyTip: '',
      photographyPermits: '',
      isPopular: false,
      tags: '',
      bestTimeToVisit: '',
      category: '',
      species: '',
      conservationStatus: '',
      availableFeatures: '',
      openTime: '',
      vehicleAccess: '',
      crowdLevel: '',
      nearestPlaces: [],
      latitude: '',
      longitude: '',
    })
  }

  return (
    <>
      {error && (
        <CAlert color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}

      <CCard className="mb-3">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>{isNew ? 'New Destination' : `Edit: ${destination?.name}`}</strong>
          <div className="d-flex gap-2">
            <CButton color="secondary" size="sm" onClick={() => navigate('/destinations')}>
              Cancel
            </CButton>
            <CButton color="primary" size="sm" onClick={handleSave} disabled={saveMut.isLoading}>
              {saveMut.isLoading ? <CSpinner size="sm" className="me-1" /> : null}
              Save
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody>
          {form && (
            <CRow className="g-3">
              <CCol md={6}>
                <label className="form-label small fw-semibold">Name *</label>
                <CFormInput size="sm" {...field('name')} />
              </CCol>
              <CCol md={3}>
                <label className="form-label small fw-semibold">Country *</label>
                <CFormInput size="sm" {...field('country')} />
              </CCol>
              <CCol md={3}>
                <label className="form-label small fw-semibold">Region</label>
                <CFormInput size="sm" {...field('region')} />
              </CCol>
              <CCol md={3}>
                <label className="form-label small fw-semibold">State</label>
                <CFormInput size="sm" {...field('state')} />
              </CCol>
              <CCol md={3}>
                <label className="form-label small fw-semibold">Status</label>
                <CFormSelect size="sm" {...field('status')}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="HIDDEN">Hidden</option>
                  <option value="ARCHIVED">Archived</option>
                </CFormSelect>
              </CCol>
              <CCol md={12}>
                <label className="form-label small fw-semibold">Description *</label>
                <CFormTextarea rows={3} {...field('description')} />
              </CCol>
              <CCol md={3}>
                <label className="form-label small fw-semibold">Latitude</label>
                <CFormInput size="sm" type="number" step="any" {...field('latitude')} />
              </CCol>
              <CCol md={3}>
                <label className="form-label small fw-semibold">Longitude</label>
                <CFormInput size="sm" type="number" step="any" {...field('longitude')} />
              </CCol>
              <CCol md={3}>
                <label className="form-label small fw-semibold">Open Time</label>
                <CFormInput size="sm" placeholder="6:00 AM - 6:00 PM" {...field('openTime')} />
              </CCol>
              <CCol md={3}>
                <label className="form-label small fw-semibold">Crowd Level</label>
                <CFormSelect size="sm" {...field('crowdLevel')}>
                  <option value="">-</option>
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <label className="form-label small fw-semibold">Vehicle Access</label>
                <CFormInput size="sm" placeholder="4WD only, All vehicles." {...field('vehicleAccess')} />
              </CCol>
              <CCol md={3}>
                <label className="form-label small fw-semibold">Photography Friendly</label>
                <CFormSelect size="sm" {...field('photographyLevel')}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <label className="form-label small fw-semibold">Compositions (comma-separated)</label>
                <CFormInput
                  size="sm"
                  placeholder="Lake-and-forest landscapes, Rare-species birding."
                  {...field('photographyCompositions')}
                />
              </CCol>
              <CCol md={6}>
                <label className="form-label small fw-semibold">Recommended Gear (comma-separated)</label>
                <CFormInput
                  size="sm"
                  placeholder="400mm+ telephoto lens, Wide-angle for lakescapes."
                  {...field('photographyRecommendedGear')}
                />
              </CCol>
              <CCol md={12}>
                <label className="form-label small fw-semibold">Photography Tip</label>
                <CFormTextarea
                  rows={2}
                  placeholder="A 400mm+ lens helps for shy forest mammals..."
                  {...field('photographyTip')}
                />
              </CCol>
              <CCol md={6}>
                <label className="form-label small fw-semibold">Photography Permits</label>
                <CFormInput
                  size="sm"
                  placeholder="Permit required from forest department."
                  {...field('photographyPermits')}
                />
              </CCol>
              <CCol md={3}>
                <label className="form-label small fw-semibold d-block">Popular</label>
                <CFormCheck
                  label="Mark as popular"
                  checked={form?.isPopular || false}
                  onChange={(e) => setForm((f) => ({ ...f, isPopular: e.target.checked }))}
                />
              </CCol>
              <CCol md={6}>
                <label className="form-label small fw-semibold">Tags (comma-separated)</label>
                <CFormInput
                  size="sm"
                  placeholder="Wildlife, Forest, Lake."
                  {...field('tags')}
                />
              </CCol>
              <CCol md={6}>
                <label className="form-label small fw-semibold">
                  Best Time To Visit (comma-separated months)
                </label>
                <CFormInput
                  size="sm"
                  placeholder="Oct, Nov, Dec."
                  {...field('bestTimeToVisit')}
                />
              </CCol>
              <CCol md={6}>
                <label className="form-label small fw-semibold">Category (comma-separated)</label>
                <CFormInput
                  size="sm"
                  placeholder="Wildlife, Forest, Lake."
                  {...field('category')}
                />
              </CCol>
              <CCol md={6}>
                <label className="form-label small fw-semibold">Species (comma-separated)</label>
                <CFormInput
                  size="sm"
                  placeholder="Bengal Tiger, Asian Elephant."
                  {...field('species')}
                />
              </CCol>
              <CCol md={6}>
                <label className="form-label small fw-semibold">Conservation Status (comma-separated)</label>
                <CFormInput
                  size="sm"
                  placeholder="Protected, National Park, UNESCO Heritage."
                  {...field('conservationStatus')}
                />
              </CCol>
              <CCol md={6}>
                <label className="form-label small fw-semibold">Available Features (comma-separated)</label>
                <CFormInput
                  size="sm"
                  placeholder="Watchtower, Guide."
                  {...field('availableFeatures')}
                />
              </CCol>
            </CRow>
          )}

          {form && (
            <>
              <div className="d-flex justify-content-between align-items-center mt-4 mb-2">
                <label className="form-label small fw-semibold mb-0">Nearby Places</label>
                <CButton size="sm" color="outline-primary" onClick={addPlaceRow}>
                  + Add Place
                </CButton>
              </div>
              {form.nearestPlaces.length === 0 ? (
                <p className="text-muted small">No nearby places added yet.</p>
              ) : (
                form.nearestPlaces.map((row, i) => (
                  <div key={i} className="border rounded p-3 mb-2 bg-body-tertiary">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="small fw-semibold text-muted">Place {i + 1}</span>
                      <CButton size="sm" color="outline-danger" onClick={() => removePlaceRow(i)}>
                        Remove
                      </CButton>
                    </div>
                    <CRow className="g-3">
                      <CCol md={6}>
                        <label className="form-label small fw-semibold">Name</label>
                        <CFormInput
                          size="sm"
                          value={row.attractionName}
                          onChange={(e) => setPlaceRowField(i, 'attractionName', e.target.value)}
                          placeholder="Kanha Museum"
                        />
                      </CCol>
                      <CCol md={3}>
                        <label className="form-label small fw-semibold">Latitude</label>
                        <CFormInput
                          size="sm"
                          type="number"
                          step="any"
                          value={row.latitude}
                          onChange={(e) => setPlaceRowField(i, 'latitude', e.target.value)}
                        />
                      </CCol>
                      <CCol md={3}>
                        <label className="form-label small fw-semibold">Longitude</label>
                        <CFormInput
                          size="sm"
                          type="number"
                          step="any"
                          value={row.longitude}
                          onChange={(e) => setPlaceRowField(i, 'longitude', e.target.value)}
                        />
                      </CCol>
                      <CCol md={12}>
                        <label className="form-label small fw-semibold">Description</label>
                        <CFormTextarea
                          size="sm"
                          rows={2}
                          value={row.attractionDescription}
                          onChange={(e) => setPlaceRowField(i, 'attractionDescription', e.target.value)}
                        />
                      </CCol>
                      <CCol md={12}>
                        <label className="form-label small fw-semibold">Image URLs (comma-separated)</label>
                        <CFormInput
                          size="sm"
                          value={row.imagesText}
                          onChange={(e) => setPlaceRowField(i, 'imagesText', e.target.value)}
                          placeholder="https://..., https://..."
                        />
                      </CCol>
                    </CRow>
                  </div>
                ))
              )}
            </>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default DestinationEdit
