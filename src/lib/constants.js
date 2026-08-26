// ==================== CURRENCY ====================
export const CURRENCY = {
  CODE: 'INR',
  SYMBOL: '₹', // ₹
  LOCALE: 'en-IN',
  MINOR_UNIT: 100, // 1 INR = 100 paise
}

/** Convert paise (integer) to formatted rupee string e.g. "₹ 1,250.00" */
export const formatRupees = (paise, opts = {}) => {
  const amount = Number(paise || 0) / CURRENCY.MINOR_UNIT
  return (
    CURRENCY.SYMBOL +
    ' ' +
    amount.toLocaleString(CURRENCY.LOCALE, {
      minimumFractionDigits: opts.decimals ?? 2,
      maximumFractionDigits: opts.decimals ?? 2,
    })
  )
}

/** Convert paise to plain number string without symbol e.g. "1,250.00" */
export const formatAmount = (paise) =>
  (Number(paise || 0) / CURRENCY.MINOR_UNIT).toLocaleString(CURRENCY.LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

// ==================== USER ROLES ====================
export const USER_ROLES = {
  PHOTOGRAPHER: 'PHOTOGRAPHER',
  SERVICE_PROVIDER: 'SERVICE_PROVIDER',
  TRIP_MANAGER: 'TRIP_MANAGER',
  ADMIN: 'ADMIN',
}

export const USER_ROLE_LABELS = {
  PHOTOGRAPHER: 'Photographer',
  SERVICE_PROVIDER: 'Service Provider',
  TRIP_MANAGER: 'Trip Manager',
  ADMIN: 'Admin',
}

export const USER_ROLE_COLOR = {
  PHOTOGRAPHER: 'secondary',
  SERVICE_PROVIDER: 'info',
  TRIP_MANAGER: 'primary',
  ADMIN: 'danger',
}

// ==================== ACCOUNT STATUS ====================
export const ACCOUNT_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BANNED: 'BANNED',
  DEACTIVATED: 'DEACTIVATED',
}

export const ACCOUNT_STATUS_COLOR = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  BANNED: 'danger',
  DEACTIVATED: 'secondary',
}

// ==================== PAYMENT STATUS ====================
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  REFUND_PENDING: 'REFUND_PENDING',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
}

export const PAYMENT_STATUS_COLOR = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  CANCELLED: 'secondary',
  REFUNDED: 'info',
  REFUND_PENDING: 'warning',
  PARTIALLY_REFUNDED: 'info',
}

// ==================== PAYOUT STATUS ====================
export const PAYOUT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  ON_HOLD: 'ON_HOLD',
  CANCELLED: 'CANCELLED',
}

export const PAYOUT_STATUS_COLOR = {
  PENDING: 'secondary',
  PROCESSING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  ON_HOLD: 'warning',
  CANCELLED: 'secondary',
}

// ==================== PAYOUT MILESTONE STATUS ====================
export const MILESTONE_STATUS = {
  PENDING: 'PENDING',
  RELEASED: 'RELEASED',
  CANCELLED: 'CANCELLED',
}

export const MILESTONE_STATUS_COLOR = {
  PENDING: 'secondary',
  RELEASED: 'success',
  CANCELLED: 'warning',
}

/** Derive milestone status from raw milestone fields */
export const getMilestoneStatus = (milestone) => {
  if (milestone.cancelledAt) return MILESTONE_STATUS.CANCELLED
  if (milestone.payoutId) return MILESTONE_STATUS.RELEASED
  return MILESTONE_STATUS.PENDING
}

// ==================== TRIP STATUS ====================
export const TRIP_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ARCHIVED: 'ARCHIVED',
}

export const TRIP_STATUS_COLOR = {
  DRAFT: 'secondary',
  ACTIVE: 'success',
  RUNNING: 'primary',
  COMPLETED: 'info',
  CANCELLED: 'danger',
  ARCHIVED: 'secondary',
}

// ==================== PARTICIPANT STATUS ====================
export const PARTICIPANT_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  SUCCESS: 'SUCCESS',
}

export const PARTICIPANT_STATUS_COLOR = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'secondary',
  SUCCESS: 'success',
}

// ==================== NOTIFICATION CHANNELS ====================
export const CHANNELS = ['IN_APP', 'EMAIL', 'WHATSAPP', 'SMS']

export const CHANNEL_COLOR = {
  IN_APP: 'primary',
  EMAIL: 'info',
  WHATSAPP: 'success',
  SMS: 'warning',
}

// ==================== NOTIFICATION STATUS ====================
export const NOTIFICATION_STATUS_COLOR = {
  PENDING: 'secondary',
  PROCESSING: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
}

// ==================== MEDIA ====================
export const MEDIA_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
}

export const MEDIA_STATUS_COLOR = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
}

// ==================== DESTINATION GATES ====================
export const GATE_COST_UNIT_LABELS = {
  PER_VEHICLE: 'Per vehicle',
  PER_PERSON: 'Per person',
  PER_SEAT: 'Per seat',
}

export const GATE_VEHICLE_CATEGORY_LABELS = {
  GYPSY: 'Gypsy',
  JEEP: 'Jeep',
  CANTER: 'Canter',
  BOAT: 'Boat',
  ELEPHANT: 'Elephant',
  VAN_BUS: 'Van/Bus',
  OTHER: 'Other',
}

// ==================== PAGINATION ====================
export const PAGE_SIZE_DEFAULT = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
