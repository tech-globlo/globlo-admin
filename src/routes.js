import React from 'react'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))

// Users
const UserList = React.lazy(() => import('./views/users/UserList'))
const UserDetail = React.lazy(() => import('./views/users/UserDetail'))
const ServiceDetail = React.lazy(() => import('./views/users/ServiceDetail'))
const SpVerification = React.lazy(() => import('./views/users/SpVerification'))
const VerificationDocuments = React.lazy(() => import('./views/users/VerificationDocuments'))
const SubscriberList = React.lazy(() => import('./views/users/SubscriberList'))

// Destinations
const DestinationList = React.lazy(() => import('./views/destinations/DestinationList'))
const DestinationDetail = React.lazy(() => import('./views/destinations/DestinationDetail'))
const DestinationEdit = React.lazy(() => import('./views/destinations/DestinationEdit'))
const DestinationRequests = React.lazy(() => import('./views/destinations/DestinationRequests'))
const HotspotList = React.lazy(() => import('./views/destinations/HotspotList'))

// Trips
const TripList = React.lazy(() => import('./views/trips/TripList'))
const TripDetail = React.lazy(() => import('./views/trips/TripDetail'))
const CuratedTrips = React.lazy(() => import('./views/trips/CuratedTrips'))

// Finance
const FinancialDashboard = React.lazy(() => import('./views/finance/FinancialDashboard'))
const PaymentDetail = React.lazy(() => import('./views/finance/PaymentDetail'))
const PayoutList = React.lazy(() => import('./views/finance/PayoutList'))
const PayoutDetail = React.lazy(() => import('./views/finance/PayoutDetail'))
const PayoutSchedule = React.lazy(() => import('./views/finance/PayoutSchedule'))
const PaymentList = React.lazy(() => import('./views/finance/PaymentList'))
const RefundList = React.lazy(() => import('./views/finance/RefundList'))
const DiscountList = React.lazy(() => import('./views/finance/DiscountList'))
const RefundDetail = React.lazy(() => import('./views/finance/RefundDetail'))
const LinkedAccounts = React.lazy(() => import('./views/finance/LinkedAccounts'))
const LinkedAccountDetail = React.lazy(() => import('./views/finance/LinkedAccountDetail'))
const PayoutMethods = React.lazy(() => import('./views/finance/PayoutMethods'))
const PayoutMethodDetail = React.lazy(() => import('./views/finance/PayoutMethodDetail'))

// Operations
const CaseList = React.lazy(() => import('./views/operations/CaseList'))
const CaseDetail = React.lazy(() => import('./views/operations/CaseDetail'))
const BroadcastList = React.lazy(() => import('./views/operations/BroadcastList'))
const ReviewList = React.lazy(() => import('./views/operations/ReviewList'))
const MessageList = React.lazy(() => import('./views/operations/MessageList'))

// Jungle Mode
const SafariSessions = React.lazy(() => import('./views/jungle/SafariSessions'))
const SafariSessionDetail = React.lazy(() => import('./views/jungle/SafariSessionDetail'))
const SpeciesList = React.lazy(() => import('./views/jungle/SpeciesList'))

// Monitoring
const LiveUsers = React.lazy(() => import('./views/monitoring/LiveUsers'))
const WebhookLog = React.lazy(() => import('./views/monitoring/WebhookLog'))
const NotificationLog = React.lazy(() => import('./views/monitoring/NotificationLog'))
const NotificationQueue = React.lazy(() => import('./views/monitoring/NotificationQueue'))
const Analytics = React.lazy(() => import('./views/monitoring/Analytics'))
const CronJobs = React.lazy(() => import('./views/monitoring/CronJobs'))
const TriggerList = React.lazy(() => import('./views/monitoring/TriggerList'))

// Media
const MediaLibrary = React.lazy(() => import('./views/media/MediaLibrary'))

// Profile
const AdminProfile = React.lazy(() => import('./views/profile/AdminProfile'))

// Settings
const PlatformFeeSettings = React.lazy(() => import('./views/settings/PlatformFeeSettings'))
const TaxSettings = React.lazy(() => import('./views/settings/TaxSettings'))
const PolicySettings = React.lazy(() => import('./views/settings/PolicySettings'))
const NotificationTemplates = React.lazy(() => import('./views/settings/NotificationTemplates'))

export const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },

  // Users
  { path: '/users', name: 'Users', element: UserList },
  { path: '/users/:id', name: 'User Detail', element: UserDetail },
  { path: '/services/:id', name: 'Service Detail', element: ServiceDetail },
  { path: '/verification/service-providers', name: 'SP Verification', element: SpVerification },
  {
    path: '/verification/documents',
    name: 'Verification Documents',
    element: VerificationDocuments,
  },
  { path: '/subscribers', name: 'Subscribers', element: SubscriberList },

  // Destinations
  { path: '/destinations', name: 'Destinations', element: DestinationList },
  { path: '/destinations/requests', name: 'Destination Requests', element: DestinationRequests },
  { path: '/destinations/new', name: 'New Destination', element: DestinationEdit },
  { path: '/destinations/:id', name: 'Destination Detail', element: DestinationDetail },
  { path: '/destinations/:id/edit', name: 'Edit Destination', element: DestinationEdit },
  { path: '/hotspots', name: 'Hotspots', element: HotspotList },

  // Trips
  { path: '/trips', name: 'Trips', element: TripList },
  { path: '/trips/curated', name: 'Curated Trips', element: CuratedTrips },
  { path: '/trips/:id', name: 'Trip Detail', element: TripDetail },

  // Finance - specific paths before parameterised ones
  { path: '/finance', name: 'Financial Dashboard', element: FinancialDashboard },
  { path: '/payments/refunds/:id', name: 'Refund Detail', element: RefundDetail },
  { path: '/payments/refunds', name: 'Refunds', element: RefundList },
  { path: '/payments/coupons', name: 'Coupons', element: DiscountList },
  { path: '/payments/:id', name: 'Payment Detail', element: PaymentDetail },
  { path: '/payments', name: 'Payments', element: PaymentList },
  {
    path: '/payouts/linked-accounts/:id',
    name: 'Linked Account Detail',
    element: LinkedAccountDetail,
  },
  { path: '/payouts/linked-accounts', name: 'Linked Accounts', element: LinkedAccounts },
  { path: '/payouts/methods/:id', name: 'Payout Method Detail', element: PayoutMethodDetail },
  { path: '/payouts/methods', name: 'Payout Methods', element: PayoutMethods },
  { path: '/payouts/schedule', name: 'Payout Schedule', element: PayoutSchedule },
  { path: '/payouts/:id', name: 'Payout Detail', element: PayoutDetail },
  { path: '/payouts', name: 'Payouts', element: PayoutList },

  // Operations
  { path: '/cases', name: 'Cases', element: CaseList },
  { path: '/cases/:id', name: 'Case Detail', element: CaseDetail },
  { path: '/broadcasts', name: 'Broadcasts', element: BroadcastList },
  { path: '/reviews', name: 'Reviews', element: ReviewList },
  { path: '/messages', name: 'Messages', element: MessageList },

  // Jungle Mode
  { path: '/jungle-mode', name: 'Jungle Mode', element: SafariSessions },
  { path: '/jungle-mode/:id', name: 'Session Detail', element: SafariSessionDetail },
  { path: '/species', name: 'Species', element: SpeciesList },

  // Monitoring
  { path: '/live', name: 'Live Users', element: LiveUsers },
  { path: '/webhooks', name: 'Webhooks', element: WebhookLog },
  { path: '/notifications/log', name: 'Notification Log', element: NotificationLog },
  { path: '/notifications/queue', name: 'Notification Queue', element: NotificationQueue },
  { path: '/analytics', name: 'Analytics', element: Analytics },
  { path: '/cron', name: 'Cron Jobs', element: CronJobs },
  { path: '/triggers', name: 'Triggers', element: TriggerList },

  // Media
  { path: '/media', name: 'Media Library', element: MediaLibrary },

  // Profile
  { path: '/profile', name: 'Profile', element: AdminProfile },

  // Settings
  { path: '/settings/platform-fee', name: 'Platform Fee', element: PlatformFeeSettings },
  { path: '/settings/tax', name: 'Tax Policy', element: TaxSettings },
  { path: '/settings/policies', name: 'Policies', element: PolicySettings },
  {
    path: '/settings/notification-templates',
    name: 'Notification Templates',
    element: NotificationTemplates,
  },
]

export default routes
