'use client'

import { createContext, useContext } from 'react'

export type PortalRailContextValue = {
  collapsed: boolean
  onToggleCollapse?: () => void
  badges?: Record<string, number>
  inDrawer?: boolean
  onNavigate?: () => void
}

export const PortalRailContext = createContext<PortalRailContextValue | null>(null)

export function usePortalRail() {
  return useContext(PortalRailContext)
}
