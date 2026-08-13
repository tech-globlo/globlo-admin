import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CAlert,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { useAuth } from '../../../context/AuthContext'
import { API_BASE_URL } from '../../../lib/config'

const Login = () => {
  const { login, loading, error, isAuth } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  // Already authenticated (e.g. token in localStorage from another tab, a
  // stale bookmark, or direct URL entry) — bounce straight to the
  // dashboard instead of showing the login form again.
  if (isAuth) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await login(identifier, password)
    if (ok) navigate('/dashboard', { replace: true })
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={5}>
            <CCard className="p-4">
              <CCardBody>
                <CForm onSubmit={handleSubmit}>
                  <h1>Globlo Admin</h1>
                  <p className="text-body-secondary mb-4">Sign in to your admin account</p>

                  {error && <CAlert color="danger">{error}</CAlert>}

                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Email or phone"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                    />
                  </CInputGroup>

                  <p className="text-body-secondary small mb-3">
                    API: <code>{API_BASE_URL}</code>
                  </p>

                  <CInputGroup className="mb-4">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type="password"
                      placeholder="Password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </CInputGroup>

                  <CButton color="primary" type="submit" className="px-4 w-100" disabled={loading}>
                    {loading ? <CSpinner size="sm" className="me-2" /> : null}
                    {loading ? 'Signing in.' : 'Sign In'}
                  </CButton>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
