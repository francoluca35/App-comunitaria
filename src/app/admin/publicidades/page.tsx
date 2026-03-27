'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { ArrowLeft, Banknote, Loader2, Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type AdminRequest = {
  id: string
  title: string
  description: string
  phone_number: string | null
  instagram: string | null
  images: string[]
  days_active: number
  status: string
  price_amount: number
  created_at: string
}

export default function AdminPublicidadesPage() {
  const router = useRouter()
  const { currentUser } = useApp()

  const [adminLoading, setAdminLoading] = useState(false)
  const [pending, setPending] = useState<AdminRequest[]>([])
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)

  const getAccessToken = useCallback(async () => {
    const supabase = createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    return sessionData.session?.access_token ?? null
  }, [])

  const refreshAdminPending = useCallback(async () => {
    if (!currentUser?.isAdmin) return
    const accessToken = await getAccessToken()
    if (!accessToken) return

    setAdminLoading(true)
    try {
      const res = await fetch('/api/admin/publicidades?status=pending', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('No se pudo cargar')
      const data = (await res.json().catch(() => [])) as unknown
      if (Array.isArray(data)) setPending(data as AdminRequest[])
    } catch {
      toast.error('No se pudieron cargar las solicitudes')
    } finally {
      setAdminLoading(false)
    }
  }, [currentUser?.isAdmin, getAccessToken])

  useEffect(() => {
    if (!currentUser) return
    if (!currentUser.isAdmin) {
      router.replace('/publicidades/crear')
      return
    }
    void refreshAdminPending()
  }, [currentUser, refreshAdminPending, router])

  const adminAct = async (id: string, action: 'approve' | 'reject') => {
    if (!currentUser?.isAdmin) return
    const accessToken = await getAccessToken()
    if (!accessToken) return

    setActionBusyId(id)
    try {
      const res = await fetch(`/api/admin/publicidades/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? 'No se pudo actualizar')
        return
      }
      toast.success(action === 'approve' ? 'OK: se generó el link de pago' : 'Solicitud rechazada')
      await refreshAdminPending()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setActionBusyId(null)
    }
  }

  if (!currentUser?.isAdmin) {
    return (
      <DashboardLayout>
        <div className="w-full max-w-3xl mx-auto pb-8 flex justify-center py-10">
          <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-3xl mx-auto pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Solicitudes de publicidades</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pendientes para moderar: <strong>{pending.length}</strong>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {adminLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
            </div>
          ) : pending.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
                No hay solicitudes pendientes.
              </CardContent>
            </Card>
          ) : (
            pending.map((req) => (
              <Card key={req.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {req.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={req.images[0]} alt={req.title} className="w-full h-full object-cover" />
                      ) : (
                        <Megaphone className="w-7 h-7 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{req.title}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-3">{req.description}</CardDescription>
                      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Banknote className="w-3.5 h-3.5" />
                          {req.days_active} días
                        </span>
                      </div>
                      {(req.phone_number || req.instagram) && (
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {req.phone_number ? `Tel: ${req.phone_number}` : null}
                          {req.phone_number && req.instagram ? ' · ' : null}
                          {req.instagram ? `IG: ${req.instagram}` : null}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    disabled={actionBusyId === req.id}
                    onClick={() => void adminAct(req.id, 'reject')}
                  >
                    Rechazar
                  </Button>
                  <Button disabled={actionBusyId === req.id} onClick={() => void adminAct(req.id, 'approve')}>
                    {actionBusyId === req.id ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando…
                      </span>
                    ) : (
                      'OK'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

