'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSessionSafe, fetchProfileFromApi } from '@/lib/auth-api'
import { registerWebPushIfPossible } from '@/lib/push-client'
import { showPushEnrollmentPreviewFirstTime } from '@/lib/notifications'
import { useAppendRecentRegistration } from '@/app/providers/recent-registrations-context'
import { profileToUser, userFromSession } from '@/app/providers/user-mapper'
import type { AuthContextType, NotificationPreference, User } from '@/app/providers/types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/** Evita "Uncaught (in promise) AbortError" del cliente Supabase Auth (lock entre pestañas/requests). */
function useSuppressSupabaseAuthAbortError() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (event: PromiseRejectionEvent) => {
      const r = event?.reason
      const isAbort = r?.name === 'AbortError' || (typeof r?.message === 'string' && r.message.includes('Lock broken'))
      if (isAbort) event.preventDefault()
    }
    window.addEventListener('unhandledrejection', handler)
    return () => window.removeEventListener('unhandledrejection', handler)
  }, [])
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const appendRecentRegistration = useAppendRecentRegistration()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!currentUser?.id) return
    let cancelled = false
    const run = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (cancelled || !session?.access_token) return
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
        await registerWebPushIfPossible(session.access_token)
      } catch {
        // ignore
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [currentUser?.id, supabase])

  useSuppressSupabaseAuthAbortError()

  useEffect(() => {
    let cancelled = false
    const loadSession = async () => {
      try {
        const {
          data: { session },
        } = await getSessionSafe(supabase)
        if (cancelled) return
        if (session?.user) {
          const profile = await fetchProfileFromApi(session.access_token)
          if (cancelled) return
          if (profile && profile.status !== 'blocked') {
            setCurrentUser(profileToUser(profile))
          } else {
            setCurrentUser(userFromSession(session.user))
          }
        }
      } catch (e) {
        console.error('Auth load error:', e)
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    }
    loadSession().catch(() => {})

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        try {
          if (!session?.user) {
            setCurrentUser(null)
            return
          }
          const profile = await fetchProfileFromApi(session.access_token)
          if (profile && profile.status !== 'blocked') {
            setCurrentUser(profileToUser(profile))
          } else {
            setCurrentUser(userFromSession(session.user))
          }
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') return
          console.error('Auth state change error:', e)
        }
      })()
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await getSessionSafe(supabase)
      if (!session?.user) return
      const profile = await fetchProfileFromApi(session.access_token)
      if (profile && profile.status !== 'blocked') {
        setCurrentUser(profileToUser(profile))
      } else {
        setCurrentUser(userFromSession(session.user))
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      console.error('Refresh user error:', e)
    }
  }, [supabase])

  const setNotificationPreference = useCallback(
    async (preference: NotificationPreference): Promise<{ ok: boolean; error?: string }> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token) return { ok: false, error: 'Sesión expirada' }
        const res = await fetch('/api/profile/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ notification_preference: preference }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          return { ok: false, error: (j as { error?: string }).error ?? res.statusText }
        }
        if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
          await window.Notification.requestPermission()
        }
        await refreshUser()
        if (typeof window !== 'undefined' && window.Notification?.permission === 'granted') {
          const pushRes = await registerWebPushIfPossible(session.access_token)
          if (pushRes.ok) await showPushEnrollmentPreviewFirstTime()
        }
        return { ok: true }
      } catch {
        return { ok: false, error: 'Error de conexión' }
      }
    },
    [supabase, refreshUser]
  )

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      const maxLoginRetries = 3
      let data: { user: unknown; session: { access_token: string } } | null = null
      let error: { message?: string; status?: number } | null = null

      for (let attempt = 0; attempt < maxLoginRetries; attempt++) {
        try {
          const result = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          })
          data = result.data as { user: unknown; session: { access_token: string } } | null
          error = result.error as { message?: string; status?: number } | null
          break
        } catch (e) {
          const isAbort = e instanceof Error && e.name === 'AbortError'
          if (!isAbort) return { ok: false, error: 'Error de conexión. Revisá tu internet e intentá de nuevo.' }
          if (attempt < maxLoginRetries - 1) await new Promise((r) => setTimeout(r, 450))
          else return { ok: false, error: 'Intentá de nuevo (cierra otras pestañas de la app o esperá un momento).' }
        }
      }

      if (error) {
        const status = error.status
        const msg = (error.message ?? '').toLowerCase()
        if (status === 500) {
          return {
            ok: false,
            error: 'Error del servidor. Intentá de nuevo en unos minutos o creá el usuario desde la app (Registrarse).',
          }
        }
        if (status === 429 || msg.includes('429') || msg.includes('rate limit') || msg.includes('too many')) {
          return { ok: false, error: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.' }
        }
        if (status === 400 || msg.includes('invalid login') || msg.includes('invalid')) {
          return { ok: false, error: 'Email o contraseña incorrectos' }
        }
        if (msg.includes('email not confirmed') || msg.includes('confirm')) {
          return { ok: false, error: 'Confirmá tu email antes de iniciar sesión (revisá la bandeja de entrada)' }
        }
        return { ok: false, error: error.message || 'Error al iniciar sesión' }
      }
      if (!data?.user) return { ok: false, error: 'Error al iniciar sesión' }

      const u = data.user as { id: string; email?: string | null; user_metadata?: { name?: string } | null }
      setCurrentUser(userFromSession(u))

      const token = data.session?.access_token
      if (token) {
        const profile = await fetchProfileFromApi(token)
        if (profile?.status === 'blocked') {
          await supabase.auth.signOut().catch(() => {})
          setCurrentUser(null)
          return { ok: false, error: 'Usuario bloqueado.' }
        }
        if (profile) setCurrentUser(profileToUser(profile))
      }

      return { ok: true }
    },
    [supabase]
  )

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    const { error } = await supabase.auth
      .signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      })
      .catch(() => ({ error: { message: 'AbortError' } }))
    return !error
  }, [supabase])

  const loginWithFacebook = useCallback(async (): Promise<boolean> => {
    const { error } = await supabase.auth
      .signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: `${window.location.origin}/` },
      })
      .catch(() => ({ error: { message: 'AbortError' } }))
    return !error
  }, [supabase])

  const logout = useCallback(async () => {
    setCurrentUser(null)
    const maxRetries = 3
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await supabase.auth.signOut()
        return
      } catch (e) {
        const isAbort = e instanceof Error && e.name === 'AbortError'
        if (!isAbort) return
        if (attempt < maxRetries - 1) await new Promise((r) => setTimeout(r, 400))
      }
    }
  }, [supabase])

  const register = useCallback(
    async (data: {
      name: string
      birthDate: string
      phone: string
      province: string
      locality: string
      email: string
      password: string
    }): Promise<{ ok: boolean; error?: string }> => {
      const email = data.email.trim().toLowerCase()
      try {
        const { data: signUpData, error } = await supabase.auth
          .signUp({
            email,
            password: data.password,
            options: {
              data: {
                name: data.name.trim() || undefined,
                birth_date: data.birthDate || undefined,
                phone: data.phone.trim() || undefined,
                province: data.province.trim() || undefined,
                locality: data.locality.trim() || undefined,
              },
            },
          })
          .catch((e) => {
            if (e?.name === 'AbortError') return { data: null, error: { message: 'AbortError' } as Error }
            throw e
          })

        if (error) {
          const msg = (error.message ?? '').toLowerCase()
          if (msg === 'aborterror') return { ok: false, error: 'Intentá de nuevo (sesión en uso en otra pestaña).' }
          const status = (error as { status?: number }).status
          if (status === 429 || msg.includes('429') || msg.includes('rate limit') || msg.includes('too many')) {
            return {
              ok: false,
              error: 'Demasiados intentos de registro. Esperá unos minutos (o 1 hora para el mismo email) e intentá de nuevo.',
            }
          }
          if (status === 500) {
            return { ok: false, error: 'Error del servidor. Intentá de nuevo en unos minutos.' }
          }
          if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('already been')) {
            return { ok: false, error: 'Ese email ya está registrado. Iniciá sesión o usá otro email.' }
          }
          return { ok: false, error: error.message || 'Error al crear la cuenta' }
        }

        if (!signUpData?.user) return { ok: false, error: 'Error al crear la cuenta' }

        const uid = signUpData.user.id
        const uEmail = signUpData.user.email ?? email
        const displayName = (data.name.trim() || signUpData.user.email || '').trim() || uEmail

        let userForContext: User
        const token = signUpData.session?.access_token
        if (token) {
          const profile = await fetchProfileFromApi(token)
          userForContext =
            profile && profile.status !== 'blocked'
              ? profileToUser(profile)
              : {
                  id: uid,
                  email: uEmail,
                  name: displayName,
                  isAdmin: false,
                  isBlocked: false,
                  avatar: undefined,
                  notificationPreference: 'all',
                }
        } else {
          userForContext = {
            id: uid,
            email: uEmail,
            name: displayName,
            isAdmin: false,
            isBlocked: false,
            avatar: undefined,
            notificationPreference: 'all',
          }
        }
        setCurrentUser(userForContext)
        appendRecentRegistration({
          id: uid,
          email: uEmail,
          name: data.name.trim() || uEmail,
          birthDate: data.birthDate || '',
          phone: data.phone.trim() || '',
          province: data.province.trim() || '',
          locality: data.locality.trim() || '',
          createdAt: new Date(),
        })
        return { ok: true }
      } catch {
        return { ok: false, error: 'Error de conexión. Revisá tu internet e intentá de nuevo.' }
      }
    },
    [supabase, appendRecentRegistration]
  )

  const value = useMemo<AuthContextType>(
    () => ({
      currentUser,
      authLoading,
      login,
      loginWithGoogle,
      loginWithFacebook,
      logout,
      register,
      refreshUser,
      setNotificationPreference,
    }),
    [
      currentUser,
      authLoading,
      login,
      loginWithGoogle,
      loginWithFacebook,
      logout,
      register,
      refreshUser,
      setNotificationPreference,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
