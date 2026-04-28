'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useApp, type NotificationPreference } from '@/app/providers'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Label } from '@/app/components/ui/label'
import { Switch } from '@/app/components/ui/switch'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Bell, FileText, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { showSystemNotification } from '@/lib/notifications'

export default function ConfiguracionPage() {
  const router = useRouter()
  const { currentUser, authLoading, setNotificationPreference } = useApp()
  const { theme, setTheme } = useTheme()
  const [notificationSaving, setNotificationSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login')
    }
  }, [authLoading, currentUser, router])

  if (!currentUser) {
    return null
  }

  const currentPreference = currentUser.notificationPreference ?? 'all'

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preferencias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode" className="flex items-center gap-2 cursor-pointer">
                <span>Modo oscuro</span>
              </Label>
              <Switch
                id="dark-mode"
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-gray-700">
              <Label className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4" />
                Notificaciones
              </Label>
              <p className="text-sm text-slate-500 dark:text-gray-400 mb-3">
                Por defecto están <strong>activas todas</strong> las notificaciones. Solo cambian si elegís otra opción
                abajo (personalizado o solo mensajes).
              </p>
              <div className="flex flex-col gap-2">
                {(
                  [
                    { value: 'all' as const, label: 'Todas (publicaciones, mensajes y avisos)' },
                    { value: 'custom' as const, label: 'Personalizado' },
                    { value: 'messages_only' as const, label: 'Solo mensajes' },
                  ] as { value: NotificationPreference; label: string }[]
                ).map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-gray-700 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-800/50 has-[:checked]:border-[#8B0015] has-[:checked]:bg-[#8B0015]/10 dark:has-[:checked]:bg-[#8B0015]/20"
                  >
                    <input
                      type="radio"
                      name="notification_preference"
                      value={value}
                      checked={currentPreference === value}
                      disabled={notificationSaving}
                      onChange={async () => {
                        setNotificationSaving(true)
                        const result = await setNotificationPreference(value)
                        setNotificationSaving(false)
                        if (result.ok) {
                          toast.success('Preferencia guardada')
                          await showSystemNotification({
                            title: 'Comunidad',
                            body: 'Notificaciones configuradas. Vas a recibir avisos aquí.',
                            tag: 'notification-preference',
                          })
                        } else toast.error(result.error ?? 'Error al guardar')
                      }}
                      className="rounded-full border-slate-300 text-[#8B0015] focus:ring-[#8B0015]"
                    />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-gray-700">
              <Label className="mb-3 block">Legal</Label>
              <div className="flex flex-col gap-2">
                <Link
                  href="/politica-de-privacidad"
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800/50"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Política de privacidad
                  </span>
                </Link>
                <Link
                  href="/terminos-y-condiciones"
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800/50"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Términos y condiciones
                  </span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
