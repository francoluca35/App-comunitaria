'use client'

import { useAuth as useAuthFromProviders } from '@/app/providers/auth-context'

/**
 * Subconjunto de la API de auth para pantallas que solo necesitan login/registro.
 * El perfil se hidrata vía API en AuthProvider. Usar dentro del árbol Providers.
 */
export function useAuth() {
  const ctx = useAuthFromProviders()
  return {
    currentUser: ctx.currentUser,
    authLoading: ctx.authLoading,
    login: ctx.login,
    logout: ctx.logout,
    register: ctx.register,
    loginWithGoogle: ctx.loginWithGoogle,
  }
}
