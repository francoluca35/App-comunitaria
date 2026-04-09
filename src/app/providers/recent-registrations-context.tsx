'use client'

import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { RegistrationNotification } from '@/app/providers/types'

type RecentRegistrationsCtx = {
  recentRegistrations: RegistrationNotification[]
  appendRecentRegistration: (r: RegistrationNotification) => void
}

const RecentRegistrationsContext = createContext<RecentRegistrationsCtx | undefined>(undefined)

export function RecentRegistrationsProvider({ children }: { children: ReactNode }) {
  const [recentRegistrations, setRecentRegistrations] = useState<RegistrationNotification[]>([])

  const appendRecentRegistration = useCallback((r: RegistrationNotification) => {
    setRecentRegistrations((prev) => [r, ...prev])
  }, [])

  const value = useMemo(
    () => ({ recentRegistrations, appendRecentRegistration }),
    [recentRegistrations, appendRecentRegistration]
  )

  return <RecentRegistrationsContext.Provider value={value}>{children}</RecentRegistrationsContext.Provider>
}

export function useRecentRegistrationsState() {
  const ctx = useContext(RecentRegistrationsContext)
  if (!ctx) throw new Error('useRecentRegistrationsState must be used within RecentRegistrationsProvider')
  return { recentRegistrations: ctx.recentRegistrations }
}

export function useAppendRecentRegistration() {
  const ctx = useContext(RecentRegistrationsContext)
  if (!ctx) throw new Error('useAppendRecentRegistration must be used within RecentRegistrationsProvider')
  return ctx.appendRecentRegistration
}
