'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, Smartphone } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { registerWebPushIfPossible } from '@/lib/push-client'
import { showPushEnrollmentPreviewFirstTime } from '@/lib/notifications'
import { toast } from 'sonner'
import { CST } from '@/lib/cst-theme'

const STORAGE_KEY = 'comunidad_mobile_push_prompt_v1'

function readStored(): 'done' | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1' ? 'done' : null
  } catch {
    return null
  }
}

function markDone() {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // ignore
  }
}

function useIsMobileViewport() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return mobile
}

type Props = {
  /** No mostrar mientras el modal de preferencias de notificaciones está abierto */
  gateOpen: boolean
  authLoading: boolean
  userId: string | null | undefined
}

/**
 * Una sola vez en móvil: invita a aceptar notificaciones del navegador y registra Web Push.
 */
export function MobileNotificationsOncePrompt({ gateOpen, authLoading, userId }: Props) {
  const isMobile = useIsMobileViewport()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (authLoading || !userId || !isMobile || !gateOpen) {
      setOpen(false)
      return
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }
    if (readStored()) return
    if (Notification.permission !== 'default') {
      markDone()
      return
    }
    setOpen(true)
  }, [authLoading, userId, isMobile, gateOpen])

  const closeAndRemember = useCallback(() => {
    markDone()
    setOpen(false)
  }, [])

  const onActivate = useCallback(async () => {
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        toast.message('Sin permiso no podemos avisarte cuando la app esté cerrada.')
        closeAndRemember()
        return
      }

      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Sesión no disponible. Probá de nuevo.')
        setBusy(false)
        return
      }

      const result = await registerWebPushIfPossible(session.access_token)
      if (result.ok) {
        await showPushEnrollmentPreviewFirstTime()
        toast.success('Listo: mismo aviso que verás con las alertas, aunque la app esté cerrada.')
      } else if (result.reason === 'no_vapid') {
        toast.message('Notificaciones activadas. El aviso push completo requiere VAPID en el servidor.')
      } else {
        toast.message('Permiso guardado. Si no llegan avisos, revisá la conexión.')
      }
      closeAndRemember()
    } catch {
      toast.error('No se pudo completar. Reintentá desde Configuración más tarde.')
      closeAndRemember()
    } finally {
      setBusy(false)
    }
  }, [closeAndRemember])

  const onLater = useCallback(() => {
    closeAndRemember()
  }, [closeAndRemember])

  if (!isMobile) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onLater()}>
      <DialogContent
        className="max-w-[min(100vw-1.5rem,22rem)] gap-4 rounded-2xl border-2 border-[#D8D2CC] bg-[#F4EFEA] p-5 shadow-xl sm:rounded-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3 text-left">
          <div className="flex justify-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md"
              style={{ backgroundColor: CST.bordo }}
              aria-hidden
            >
              <Smartphone className="h-7 w-7" strokeWidth={2} />
            </span>
          </div>
          <DialogTitle className="text-center text-lg font-bold leading-snug text-[#2B2B2B] font-montserrat-only">
            ¿Querés recibir notificaciones en el celular?
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed text-[#5c4a42]">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#8B0015]">
              <Bell className="h-4 w-4 shrink-0" aria-hidden />
              Solo te lo preguntamos una vez.
            </span>{' '}
            Así podés enterarte de <strong>alertas importantes</strong> aunque no tengas la app abierta.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="h-12 w-full rounded-xl text-base font-semibold text-white shadow-md"
            style={{ backgroundColor: CST.bordo }}
            disabled={busy}
            onClick={() => void onActivate()}
          >
            {busy ? 'Activando…' : 'Sí, avisarme'}
          </Button>
          <Button type="button" variant="ghost" className="h-11 w-full rounded-xl text-[#7A5C52]" disabled={busy} onClick={onLater}>
            Ahora no
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
