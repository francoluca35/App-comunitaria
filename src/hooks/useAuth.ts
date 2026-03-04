'use client'

import { useApp } from '@/app/providers'

/**
 * Hook de autenticación. Expone solo lo necesario para login/register/logout.
 * Debe usarse dentro de <Providers> (AppProvider).
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
