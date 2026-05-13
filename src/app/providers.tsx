'use client'

import React, { useEffect, useMemo, type ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from './components/ui/sonner'
import { MobileNotificationsOncePrompt } from '@/components/MobileNotificationsOncePrompt'
import { PushEnrollmentBanner } from '@/components/PushEnrollmentBanner'
import { RealtimeNotificationSubscriptions } from '@/components/RealtimeNotificationSubscriptions'
import { AppConfigProvider, useAppConfig } from '@/app/providers/app-config-context'
import { AuthProvider, useAuth } from '@/app/providers/auth-context'
import { CategoriesProvider, useCategories } from '@/app/providers/categories-context'
import { CommunityProvider, useCommunity } from '@/app/providers/community-context'
import { RecentRegistrationsProvider, useRecentRegistrationsState } from '@/app/providers/recent-registrations-context'
import type { AppContextType } from '@/app/providers/types'

export type {
  Category,
  PublicidadCategorySlug,
  PostStatus,
  NotificationPreference,
  User,
  AdminProfile,
  PostMediaKind,
  PostMediaItem,
  Post,
  Comment,
  AppConfig,
  RegistrationNotification,
} from '@/app/providers/types'

export { useAuth } from '@/app/providers/auth-context'
export { useAppConfig } from '@/app/providers/app-config-context'
export { useCategories } from '@/app/providers/categories-context'
export { useCommunity } from '@/app/providers/community-context'

function AppChrome() {
  const { authLoading, currentUser } = useAuth()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const clearBadge = () => {
      if ('clearAppBadge' in navigator && typeof navigator.clearAppBadge === 'function') {
        void navigator.clearAppBadge()
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') clearBadge()
    }
    window.addEventListener('focus', clearBadge)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', clearBadge)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return (
    <>
      <PushEnrollmentBanner authLoading={authLoading} userId={currentUser?.id} />
      <RealtimeNotificationSubscriptions />
      <MobileNotificationsOncePrompt authLoading={authLoading} userId={currentUser?.id} />
    </>
  )
}

export function AppProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  return (
    <RecentRegistrationsProvider>
      <AuthProvider>
        <AppConfigProvider>
          <CategoriesProvider>
            <CommunityProvider>
              <AppChrome />
              {children}
            </CommunityProvider>
          </CategoriesProvider>
        </AppConfigProvider>
      </AuthProvider>
    </RecentRegistrationsProvider>
  )
}

export function useApp(): AppContextType {
  const auth = useAuth()
  const { recentRegistrations } = useRecentRegistrationsState()
  const cfg = useAppConfig()
  const cats = useCategories()
  const comm = useCommunity()
  return useMemo(
    () => ({
      ...auth,
      recentRegistrations,
      ...cfg,
      ...cats,
      ...comm,
    }),
    [auth, recentRegistrations, cfg, cats, comm]
  )
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AppProvider>
        {children}
        <Toaster />
      </AppProvider>
    </ThemeProvider>
  )
}
