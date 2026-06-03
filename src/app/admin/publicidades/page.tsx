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
import { optimizedStorageImageUrl } from '@/lib/storage-image'
import { DeletePublicidadButton } from '@/components/DeletePublicidadButton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'

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

function AdminPublicidadCard({
  req,
  actionBusyId,
  onApprove,
  onReject,
  onDeleted,
  showModerationActions,
}: {
  req: AdminRequest
  actionBusyId: string | null
  onApprove?: () => void
  onReject?: () => void
  onDeleted: () => void
  showModerationActions?: boolean
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
            {req.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={optimizedStorageImageUrl(req.images[0], { width: 160, height: 160, quality: 70, resize: 'cover' })}
                alt={req.title}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
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
                {req.days_active} días · {req.status}
                {req.price_amount > 0 ? ` · $${req.price_amount}` : ''}
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
      <CardContent className="flex flex-wrap gap-2 justify-end">
        {showModerationActions ? (
          <>
            <Button variant="outline" disabled={actionBusyId === req.id} onClick={onReject}>
              Rechazar
            </Button>
            <Button disabled={actionBusyId === req.id} onClick={onApprove}>
              {actionBusyId === req.id ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando…
                </span>
              ) : (
                'OK'
              )}
            </Button>
          </>
        ) : null}
        <DeletePublicidadButton publicidadId={req.id} variant="admin" onDeleted={onDeleted} />
      </CardContent>
    </Card>
  )
}

export default function AdminPublicidadesPage() {
  const router = useRouter()
  const { currentUser } = useApp()

  const [adminLoading, setAdminLoading] = useState(false)
  const [pending, setPending] = useState<AdminRequest[]>([])
  const [active, setActive] = useState<AdminRequest[]>([])
  const [inactive, setInactive] = useState<AdminRequest[]>([])
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)

  const getAccessToken = useCallback(async () => {
    const supabase = createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    return sessionData.session?.access_token ?? null
  }, [])

  const fetchByStatus = useCallback(
    async (status: string): Promise<AdminRequest[]> => {
      const accessToken = await getAccessToken()
      if (!accessToken) return []
      const res = await fetch(`/api/admin/publicidades?status=${status}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('No se pudo cargar')
      const data = (await res.json().catch(() => [])) as unknown
      return Array.isArray(data) ? (data as AdminRequest[]) : []
    },
    [getAccessToken]
  )

  const refreshAdminLists = useCallback(async () => {
    if (!currentUser?.isAdmin) return
    setAdminLoading(true)
    try {
      const [pendingRows, activeRows, paymentRows, rejectedRows] = await Promise.all([
        fetchByStatus('pending'),
        fetchByStatus('active'),
        fetchByStatus('payment_pending'),
        fetchByStatus('rejected'),
      ])
      setPending(pendingRows)
      setActive(activeRows)
      setInactive([...paymentRows, ...rejectedRows])
    } catch {
      toast.error('No se pudieron cargar las publicidades')
    } finally {
      setAdminLoading(false)
    }
  }, [currentUser?.isAdmin, fetchByStatus])

  useEffect(() => {
    if (!currentUser) return
    if (!currentUser.isAdmin) {
      router.replace('/cartelera/crear')
      return
    }
    void refreshAdminLists()
  }, [currentUser, refreshAdminLists, router])

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
      await refreshAdminLists()
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
              Pendientes: <strong>{pending.length}</strong> · Activas: <strong>{active.length}</strong>
            </p>
          </div>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pendientes ({pending.length})</TabsTrigger>
            <TabsTrigger value="active">Activas ({active.length})</TabsTrigger>
            <TabsTrigger value="inactive">Otras ({inactive.length})</TabsTrigger>
          </TabsList>

          {adminLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <TabsContent value="pending" className="space-y-4 mt-0">
                {pending.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
                      No hay solicitudes pendientes.
                    </CardContent>
                  </Card>
                ) : (
                  pending.map((req) => (
                    <AdminPublicidadCard
                      key={req.id}
                      req={req}
                      actionBusyId={actionBusyId}
                      onApprove={() => void adminAct(req.id, 'approve')}
                      onReject={() => void adminAct(req.id, 'reject')}
                      onDeleted={() => void refreshAdminLists()}
                      showModerationActions
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="active" className="space-y-4 mt-0">
                {active.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
                      No hay publicidades activas.
                    </CardContent>
                  </Card>
                ) : (
                  active.map((req) => (
                    <AdminPublicidadCard
                      key={req.id}
                      req={req}
                      actionBusyId={actionBusyId}
                      onDeleted={() => void refreshAdminLists()}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="inactive" className="space-y-4 mt-0">
                {inactive.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
                      No hay publicidades en pago pendiente o rechazadas.
                    </CardContent>
                  </Card>
                ) : (
                  inactive.map((req) => (
                    <AdminPublicidadCard
                      key={req.id}
                      req={req}
                      actionBusyId={actionBusyId}
                      onDeleted={() => void refreshAdminLists()}
                    />
                  ))
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

