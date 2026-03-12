'use client'

import { useApp } from '@/app/providers'

/**
 * Hook de autenticación. El perfil del usuario se obtiene vía API (/api/auth/me)
 * en el servidor para evitar llamadas directas a Supabase desde el cliente y
 * reducir errores de lock (AbortError). Debe usarse dentro de <Providers> (AppProvider).
 */
export function useAuth() {
  const app = useApp()
  return {
    currentUser: app.currentUser,
    authLoading: app.authLoading,
    login: app.login,
    logout: app.logout,
    register: app.register,
    loginWithGoogle: app.loginWithGoogle,
  }
}
