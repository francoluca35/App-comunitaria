'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useApp } from '@/app/providers'
import { MARIO_EMAILS } from '@/lib/mario-account'

export interface SupportProfile {
  id: string
  name: string | null
  avatar_url: string | null
}

export { MARIO_EMAILS }

/**
 * Hook para traer el perfil de "Mario" que atiende el chat público.
 * El backend se encarga de:
 * - Buscar en `profiles` el admin por email (prioriza role=admin).
 * - Restringir acceso si el usuario es admin/moderator que NO sea Mario.
 */
export function useMarioAdmin() {
  const { currentUser } = useApp()
  const supabase = useMemo(() => createClient(), [])

  const [mario, setMario] = useState<SupportProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!currentUser) {
      setMario(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        setError('Sesión inválida')
        setMario(null)
        return
      }

      const res = await fetch('/api/chat/support', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        const msg = (j as { error?: string }).error ?? res.statusText
        setError(msg)
        setMario(null)
        return
      }

      const data = (await res.json()) as SupportProfile
      setMario(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar Mario'
      setError(msg)
      setMario(null)
    } finally {
      setLoading(false)
    }
  }, [currentUser, supabase])

  useEffect(() => {
    void reload()
  }, [reload])

  // Feedback suave: el chat ya muestra estados; este toast solo ayuda en UI general.
  useEffect(() => {
    if (!error) return
    toast.error(error)
  }, [error])

  return {
    mario,
    loading,
    error,
    reload,
    marioEmails: MARIO_EMAILS,
  }
}

