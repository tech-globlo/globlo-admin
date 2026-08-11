import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <span className="fw-semibold">Globlo</span>
        <span className="ms-1">&copy; 2026</span>
      </div>
      <div className="ms-auto">
        <span>Powered By Globlo Ventures Pvt Ltd</span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
