'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Bell, MessageCircle, Sliders } from 'lucide-react'
import type { NotificationPreference } from '@/app/providers'

const OPTIONS: { value: NotificationPreference; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Todas', description: 'Nuevas publicaciones, mensajes y avisos', icon: <Bell className="w-5 h-5" /> },
  { value: 'custom', label: 'Personalizado', description: 'Elegí después qué querés recibir', icon: <Sliders className="w-5 h-5" /> },
  { value: 'messages_only', label: 'Solo mensajes', description: 'Solo chat y mensajes directos', icon: <MessageCircle className="w-5 h-5" /> },
]

interface NotificationPreferenceModalProps {
  open: boolean
  onSelect: (preference: NotificationPreference) => void
  onDismiss: () => void
  loading?: boolean
}

export function NotificationPreferenceModal({
  open,
  onSelect,
  onDismiss,
  loading = false,
}: NotificationPreferenceModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDismiss()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-500" />
            Notificaciones
          </DialogTitle>
          <DialogDescription>
            ¿Qué notificaciones querés recibir? Podés cambiarlo después en Configuración.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={loading}
              onClick={() => onSelect(opt.value)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-gray-700 p-4 text-left hover:bg-slate-50 dark:hover:bg-gray-800/50 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors disabled:opacity-60"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                {opt.icon}
              </span>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{opt.label}</p>
                <p className="text-sm text-slate-500 dark:text-gray-400">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="ghost" onClick={onDismiss} disabled={loading} className="w-full sm:w-auto">
            Más tarde
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
