﻿import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CForm,
  CFormLabel,
  CFormInput,
  CButton,
  CSpinner,
  CAlert,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPencil,
  cilCheck,
  cilX,
  cilLockLocked,
  cilReload,
  cilLowVision,
  cilZoomIn,
} from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/dateUtils'

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
const generatePassword = (len = 14) =>
  Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')

const AdminProfile = () => {
  const { admin, login } = useAuth()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('info')

  // -"--"- Basic Info state -"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"-
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [infoMsg, setInfoMsg] = useState(null)

  // -"--"- Password state -"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"-
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', retypePassword: '' })
  const [showPw, setShowPw] = useState({ old: false, new: false, retype: false })
  const [pwMsg, setPwMsg] = useState(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['admin-profile'],
    queryFn: async () => {
      const res = await api.get('/api/admin/profile')
      return res.data.data
    },
  })

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name || '', email: profile.email || '', phone: profile.phone || '' })
    }
  }, [profile])

  const updateMut = useMutation({
    mutationFn: (payload) => api.patch('/api/admin/profile', payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-profile'] })
      const updated = res.data.data?.user
      if (updated) {
        localStorage.setItem('admin_user', JSON.stringify({ ...admin, ...updated }))
      }
      setEditing(false)
      setInfoMsg({ type: 'success', text: 'Profile updated successfully.' })
      setTimeout(() => setInfoMsg(null), 3000)
    },
    onError: (err) => {
      setInfoMsg({ type: 'danger', text: err.response?.data?.message || 'Update failed.' })
    },
  })

  const pwMut = useMutation({
    mutationFn: (payload) => api.post('/api/admin/profile/change-password', payload),
    onSuccess: () => {
      setPwForm({ oldPassword: '', newPassword: '', retypePassword: '' })
      setPwMsg({ type: 'success', text: 'Password changed successfully.' })
      setTimeout(() => setPwMsg(null), 4000)
    },
    onError: (err) => {
      setPwMsg({
        type: 'danger',
        text: err.response?.data?.message || 'Failed to change password.',
      })
    },
  })

  const handleInfoSave = () => {
    const payload = {}
    if (form.name !== profile?.name) payload.name = form.name
    if (form.email !== profile?.email) payload.email = form.email
    if (form.phone !== (profile?.phone || '')) payload.phone = form.phone || undefined
    if (Object.keys(payload).length === 0) {
      setEditing(false)
      return
    }
    updateMut.mutate(payload)
  }

  const handleInfoCancel = () => {
    setForm({ name: profile?.name || '', email: profile?.email || '', phone: profile?.phone || '' })
    setEditing(false)
    setInfoMsg(null)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setPwMsg(null)
    if (pwForm.newPassword !== pwForm.retypePassword) {
      setPwMsg({ type: 'danger', text: 'New passwords do not match.' })
      return
    }
    if (pwForm.newPassword.length < 8) {
      setPwMsg({ type: 'danger', text: 'New password must be at least 8 characters.' })
      return
    }
    pwMut.mutate({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword })
  }

  const handleGenerate = () => {
    const pw = generatePassword()
    setPwForm((f) => ({ ...f, newPassword: pw, retypePassword: pw }))
    setShowPw((s) => ({ ...s, new: true, retype: true }))
  }

  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'A'

  return (
    <CRow className="justify-content-center">
      <CCol md={8} lg={6}>
        <CCard>
          <CCardHeader className="pb-0">
            {/* Avatar + name strip */}
            <div className="d-flex align-items-center gap-3 mb-3">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#321fdb',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div>
                <div className="fw-semibold">{profile?.name || '-'}</div>
                <div className="small text-muted">{profile?.email || '-'}</div>
                <CBadge color="primary" className="mt-1">
                  {profile?.role}
                </CBadge>
              </div>
            </div>

            <CNav variant="underline-border">
              <CNavItem>
                <CNavLink
                  active={activeTab === 'info'}
                  onClick={() => setActiveTab('info')}
                  style={{ cursor: 'pointer' }}
                >
                  Basic Info
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'password'}
                  onClick={() => setActiveTab('password')}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilLockLocked} className="me-1" size="sm" />
                  Password
                </CNavLink>
              </CNavItem>
            </CNav>
          </CCardHeader>

          <CCardBody>
            {isLoading && (
              <div className="text-center py-4">
                <CSpinner color="primary" />
              </div>
            )}

            {!isLoading && (
              <CTabContent>
                {/* -"--"- Basic Info Tab -"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"- */}
                <CTabPane visible={activeTab === 'info'}>
                  {infoMsg && (
                    <CAlert color={infoMsg.type} className="py-2 small">
                      {infoMsg.text}
                    </CAlert>
                  )}

                  <div className="d-flex justify-content-end mb-3">
                    {!editing ? (
                      <CButton size="sm" color="outline-primary" onClick={() => setEditing(true)}>
                        <CIcon icon={cilPencil} className="me-1" size="sm" />
                        Edit
                      </CButton>
                    ) : (
                      <div className="d-flex gap-2">
                        <CButton
                          size="sm"
                          color="outline-secondary"
                          onClick={handleInfoCancel}
                          disabled={updateMut.isPending}
                        >
                          <CIcon icon={cilX} className="me-1" size="sm" />
                          Cancel
                        </CButton>
                        <CButton
                          size="sm"
                          color="primary"
                          onClick={handleInfoSave}
                          disabled={updateMut.isPending}
                        >
                          {updateMut.isPending ? (
                            <CSpinner size="sm" className="me-1" />
                          ) : (
                            <CIcon icon={cilCheck} className="me-1" size="sm" />
                          )}
                          Save
                        </CButton>
                      </div>
                    )}
                  </div>

                  <CForm className="d-flex flex-column gap-3">
                    <div>
                      <CFormLabel className="small fw-semibold">Full Name</CFormLabel>
                      {editing ? (
                        <CFormInput
                          size="sm"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          autoFocus
                        />
                      ) : (
                        <div className="form-control form-control-sm bg-body-secondary border-0 text-body">
                          {profile?.name || '-'}
                        </div>
                      )}
                    </div>

                    <div>
                      <CFormLabel className="small fw-semibold">Email</CFormLabel>
                      {editing ? (
                        <CFormInput
                          size="sm"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      ) : (
                        <div className="form-control form-control-sm bg-body-secondary border-0 text-body">
                          {profile?.email || '-'}
                        </div>
                      )}
                    </div>

                    <div>
                      <CFormLabel className="small fw-semibold">Phone</CFormLabel>
                      {editing ? (
                        <CFormInput
                          size="sm"
                          value={form.phone}
                          placeholder="e.g. +91 9999999999"
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                      ) : (
                        <div className="form-control form-control-sm bg-body-secondary border-0 text-body">
                          {profile?.phone || '-'}
                        </div>
                      )}
                    </div>

                    <div>
                      <CFormLabel className="small fw-semibold">Role</CFormLabel>
                      <div className="form-control form-control-sm bg-body-secondary border-0 text-body">
                        {profile?.role}
                      </div>
                    </div>

                    <div>
                      <CFormLabel className="small fw-semibold">Member Since</CFormLabel>
                      <div className="form-control form-control-sm bg-body-secondary border-0 text-body">
                        {profile?.createdAt ? fmtDate(profile.createdAt) : '-'}
                      </div>
                    </div>
                  </CForm>
                </CTabPane>

                {/* -"--"- Password Tab -"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"- */}
                <CTabPane visible={activeTab === 'password'}>
                  {pwMsg && (
                    <CAlert color={pwMsg.type} className="py-2 small">
                      {pwMsg.text}
                    </CAlert>
                  )}

                  <form onSubmit={handlePasswordSubmit} className="d-flex flex-column gap-3">
                    <div>
                      <CFormLabel className="small fw-semibold">Current Password</CFormLabel>
                      <div className="input-group input-group-sm">
                        <CFormInput
                          type={showPw.old ? 'text' : 'password'}
                          value={pwForm.oldPassword}
                          onChange={(e) => setPwForm({ ...pwForm, oldPassword: e.target.value })}
                          placeholder="Enter current password"
                          required
                        />
                        <CButton
                          type="button"
                          color="outline-secondary"
                          size="sm"
                          onClick={() => setShowPw((s) => ({ ...s, old: !s.old }))}
                        >
                          <CIcon icon={showPw.old ? cilLowVision : cilZoomIn} size="sm" />
                        </CButton>
                      </div>
                    </div>

                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <CFormLabel className="small fw-semibold mb-0">New Password</CFormLabel>
                        <CButton
                          type="button"
                          size="sm"
                          color="outline-secondary"
                          onClick={handleGenerate}
                        >
                          <CIcon icon={cilReload} className="me-1" size="sm" />
                          Generate
                        </CButton>
                      </div>
                      <div className="input-group input-group-sm">
                        <CFormInput
                          type={showPw.new ? 'text' : 'password'}
                          value={pwForm.newPassword}
                          onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                          placeholder="Min 8 characters"
                          required
                        />
                        <CButton
                          type="button"
                          color="outline-secondary"
                          size="sm"
                          onClick={() => setShowPw((s) => ({ ...s, new: !s.new }))}
                        >
                          <CIcon icon={showPw.new ? cilLowVision : cilZoomIn} size="sm" />
                        </CButton>
                      </div>
                      {pwForm.newPassword && <PasswordStrength password={pwForm.newPassword} />}
                    </div>

                    <div>
                      <CFormLabel className="small fw-semibold">Retype New Password</CFormLabel>
                      <div className="input-group input-group-sm">
                        <CFormInput
                          type={showPw.retype ? 'text' : 'password'}
                          value={pwForm.retypePassword}
                          onChange={(e) => setPwForm({ ...pwForm, retypePassword: e.target.value })}
                          placeholder="Repeat new password"
                          required
                        />
                        <CButton
                          type="button"
                          color="outline-secondary"
                          size="sm"
                          onClick={() => setShowPw((s) => ({ ...s, retype: !s.retype }))}
                        >
                          <CIcon icon={showPw.retype ? cilLowVision : cilZoomIn} size="sm" />
                        </CButton>
                      </div>
                      {pwForm.retypePassword && pwForm.newPassword && (
                        <div
                          className={`small mt-1 ${pwForm.newPassword === pwForm.retypePassword ? 'text-success' : 'text-danger'}`}
                        >
                          {pwForm.newPassword === pwForm.retypePassword
                            ? ' Passwords match'
                            : ' Passwords do not match'}
                        </div>
                      )}
                    </div>

                    <CButton
                      type="submit"
                      color="primary"
                      size="sm"
                      className="mt-1"
                      disabled={
                        pwMut.isPending ||
                        !pwForm.oldPassword ||
                        !pwForm.newPassword ||
                        !pwForm.retypePassword
                      }
                    >
                      {pwMut.isPending ? (
                        <CSpinner size="sm" className="me-1" />
                      ) : (
                        <CIcon icon={cilLockLocked} className="me-1" size="sm" />
                      )}
                      Change Password
                    </CButton>
                  </form>
                </CTabPane>
              </CTabContent>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

const strengthLevels = [
  { min: 0, label: 'Very Weak', color: 'danger', width: '20%' },
  { min: 1, label: 'Weak', color: 'warning', width: '40%' },
  { min: 2, label: 'Fair', color: 'warning', width: '60%' },
  { min: 3, label: 'Strong', color: 'success', width: '80%' },
  { min: 4, label: 'Very Strong', color: 'success', width: '100%' },
]

const getStrength = (pw) => {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(score, 4)
}

const PasswordStrength = ({ password }) => {
  const score = getStrength(password)
  const level = strengthLevels[score]
  return (
    <div className="mt-1">
      <div className="progress" style={{ height: 4 }}>
        <div
          className={`progress-bar bg-${level.color}`}
          style={{ width: level.width, transition: 'width 0.3s' }}
        />
      </div>
      <div className={`small text-${level.color} mt-1`}>{level.label}</div>
    </div>
  )
}

export default AdminProfile
