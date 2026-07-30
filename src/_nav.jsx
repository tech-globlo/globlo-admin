import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilPeople,
  cilBadge,
  cilMap,
  cilLocationPin,
  cilTask,
  cilMoney,
  cilWallet,
  cilCash,
  cilBank,
  cilWarning,
  cilBell,
  cilStar,
  cilLeaf,
  cilSignalCellular4,
  cilHttps,
  cilChart,
  cilSettings,
  cilDescription,
  cilCommentSquare,
  cilTags,
  cilCheckCircle,
  cilImage,
  cilHistory,
  cilBolt,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },

  { component: CNavTitle, name: 'Users' },
  {
    component: CNavItem,
    name: 'All Users',
    to: '/users',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
  },
  // {
  //   component: CNavItem,
  //   name: 'SP Verification',
  //   to: '/verification/service-providers',
  //   icon: <CIcon icon={cilBadge} customClassName="nav-icon" />,
  // },

  { component: CNavTitle, name: 'Content' },
  {
    component: CNavGroup,
    name: 'Destinations',
    to: '/destinations',
    icon: <CIcon icon={cilMap} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'All Destinations', to: '/destinations', end: true },
      { component: CNavItem, name: 'Requests', to: '/destinations/requests' },
      { component: CNavItem, name: 'Species', to: '/species' },
    ],
  },
  {
    component: CNavItem,
    name: 'Hotspots',
    to: '/hotspots',
    icon: <CIcon icon={cilLocationPin} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Media Library',
    to: '/media',
    icon: <CIcon icon={cilImage} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Trips',
    to: '/trips',
    icon: <CIcon icon={cilLocationPin} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'All Trips', to: '/trips', end: true },
      { component: CNavItem, name: 'Curated Trips', to: '/trips/curated' },
    ],
  },
  { component: CNavTitle, name: 'Finance' },
  {
    component: CNavItem,
    name: 'Financial Overview',
    to: '/finance',
    icon: <CIcon icon={cilChart} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Payouts',
    to: '/payouts',
    icon: <CIcon icon={cilWallet} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Payout List', to: '/payouts', end: true },
      { component: CNavItem, name: 'Schedule', to: '/payouts/schedule' },
      { component: CNavItem, name: 'Payout Methods', to: '/payouts/methods' },
      { component: CNavItem, name: 'Linked Accounts', to: '/payouts/linked-accounts' },
    ],
  },
  {
    component: CNavGroup,
    name: 'Payments',
    to: '/payments',
    icon: <CIcon icon={cilMoney} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'All Payments', to: '/payments', end: true },
      { component: CNavItem, name: 'Refunds', to: '/payments/refunds', end: true },
      { component: CNavItem, name: 'Coupons', to: '/payments/coupons', end: true },
    ],
  },

  { component: CNavTitle, name: 'Operations' },
  {
    component: CNavItem,
    name: 'Cases',
    to: '/cases',
    icon: <CIcon icon={cilTask} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Broadcasts',
    to: '/broadcasts',
    icon: <CIcon icon={cilWarning} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Reviews',
    to: '/reviews',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Jungle Mode',
    to: '/jungle-mode',
    icon: <CIcon icon={cilLeaf} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Messages',
    to: '/messages',
    icon: <CIcon icon={cilCommentSquare} customClassName="nav-icon" />,
  },

  { component: CNavTitle, name: 'Monitoring' },
  {
    component: CNavItem,
    name: 'Live Users',
    to: '/live',
    icon: <CIcon icon={cilSignalCellular4} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Webhooks',
    to: '/webhooks',
    icon: <CIcon icon={cilHttps} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Notifications',
    icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Delivery Log', to: '/notifications/log' },
      // { component: CNavItem, name: 'Queue', to: '/notifications/queue' },
    ],
  },
  {
    component: CNavItem,
    name: 'Analytics',
    to: '/analytics',
    icon: <CIcon icon={cilChart} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Cron Jobs',
    to: '/cron',
    icon: <CIcon icon={cilHistory} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Triggers',
    to: '/triggers',
    icon: <CIcon icon={cilBolt} customClassName="nav-icon" />,
  },

  { component: CNavTitle, name: 'Settings' },
  {
    component: CNavGroup,
    name: 'Settings',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
    items: [
      { component: CNavItem, name: 'Platform Fee', to: '/settings/platform-fee' },
      { component: CNavItem, name: 'Tax Policy', to: '/settings/tax' },
      { component: CNavItem, name: 'Payout / Refund Policy', to: '/settings/policies' },
      { component: CNavItem, name: 'Notification Templates', to: '/settings/notification-templates' },
    ],
  },
]

export default _nav
