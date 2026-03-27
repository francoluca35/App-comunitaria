'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { toast } from 'sonner'
import { Loader2, CheckCircle } from 'lucide-react'

type Status = 'pending' | 'payment_pending' | 'active' | 'rejected'

type Factura = {
  appName: string
  invoiceNumber: string
  issuedAt: string
  customer: { name: string | null; email: string; phone: string | null; province: string | null; locality: string | null }
  publicidad: { title: string; description: string; days_active: number; start_at: string | null; end_at: string | null }
  totals: { currency: string; total: number }
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function PagoPublicidadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = useParams()?.id as string | undefined
  const token = searchParams.get('token') || ''

  const canLoad = !!id && !!token

  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState<number>(0)
  const [days, setDays] = useState<number>(0)
  const [confirming, setConfirming] = useState(false)
  const [factura, setFactura] = useState<Factura | null>(null)

  const endpoint = useMemo(() => {
    if (!id) return ''
    return `/api/publicidad/pagos/${id}?token=${encodeURIComponent(token)}`
  }, [id, token])

  const facturaEndpoint = useMemo(() => {
    if (!id) return ''
    return `/api/publicidad/pagos/${id}/factura?token=${encodeURIComponent(token)}`
  }, [id, token])

  useEffect(() => {
    if (!canLoad) return
    setLoading(true)
    fetch(endpoint, { method: 'GET' })
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudo cargar el pago')
        const data = await res.json()
        setStatus(data.status as Status)
        setTitle(data.title ?? '')
        setPrice(typeof data.price_amount === 'number' ? data.price_amount : 0)
        setDays(typeof data.days_active === 'number' ? data.days_active : 0)
      })
      .catch(() => {
        toast.error('Link de pago inválido o vencido')
      })
      .finally(() => setLoading(false))
  }, [canLoad, endpoint])

  useEffect(() => {
    if (!canLoad) return
    if (status !== 'active') return
    fetch(facturaEndpoint, { method: 'GET' })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        if (data?.ok) setFactura(data as Factura)
      })
      .catch(() => {})
  }, [canLoad, status, facturaEndpoint])

  const handleConfirm = async () => {
    if (!id) return
    setConfirming(true)
    try {
      const res = await fetch(endpoint, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? 'No se pudo confirmar el pago')
        return
      }
      toast.success('Pago confirmado. Publicidad activada.')
      setStatus('active')
      // Precargar factura
      fetch(facturaEndpoint, { method: 'GET' })
        .then(async (r) => {
          if (!r.ok) return
          const f = await r.json()
          if (f?.ok) setFactura(f as Factura)
        })
        .catch(() => {})
    } catch {
      toast.error('Error de conexión')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-md mx-auto pb-8">
        <div className="pt-2">
          <Button variant="ghost" onClick={() => router.back()}>
            Volver
          </Button>
        </div>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === 'active' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <Loader2 className="w-5 h-5 text-slate-500" />}
              Confirmación de pago
            </CardTitle>
            <CardDescription>Usá el link para activar tu publicidad.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                Cargando…
              </div>
            ) : status === 'active' ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-4 text-sm text-emerald-800 dark:text-emerald-200">
                  Tu publicidad ya está activa. Podés verla en{' '}
                  <button type="button" className="underline" onClick={() => router.push('/mis-publicidades')}>
                    Mis publicidades
                  </button>
                  .
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                        Factura / Comprobante
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {factura?.appName ?? 'Difusión Comunitaria'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        {factura?.invoiceNumber ?? '—'} · Emitida {fmtDate(factura?.issuedAt)}
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                      Imprimir
                    </Button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
                    <div className="rounded-lg bg-slate-50 dark:bg-gray-800/60 p-3">
                      <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Datos del cliente
                      </p>
                      <p className="text-slate-900 dark:text-white">
                        {factura?.customer?.name ?? '—'}
                      </p>
                      <p className="text-slate-600 dark:text-gray-300">{factura?.customer?.email ?? '—'}</p>
                      <p className="text-slate-600 dark:text-gray-300">
                        {(factura?.customer?.locality ?? '') || (factura?.customer?.province ?? '')
                          ? `${factura?.customer?.locality ?? ''}${factura?.customer?.locality && factura?.customer?.province ? ', ' : ''}${factura?.customer?.province ?? ''}`
                          : '—'}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 dark:bg-gray-800/60 p-3">
                      <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Datos de la publicidad
                      </p>
                      <p className="text-slate-900 dark:text-white font-medium">{title}</p>
                      <p className="text-slate-600 dark:text-gray-300 line-clamp-3">{factura?.publicidad?.description ?? '—'}</p>
                      <p className="text-slate-600 dark:text-gray-300 mt-2">
                        Días: {factura?.publicidad?.days_active ?? days}
                      </p>
                      <p className="text-slate-600 dark:text-gray-300">
                        Inicio: {fmtDate(factura?.publicidad?.start_at)} · Fin: {fmtDate(factura?.publicidad?.end_at)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 dark:border-gray-700 p-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-slate-700 dark:text-gray-200">Total abonado</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {factura?.totals?.total ?? price} {factura?.totals?.currency ?? 'ARS'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] text-slate-500 dark:text-gray-400">
                    Este comprobante es informativo. No incluye imágenes.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <Label>Título</Label>
                  <Input value={title} readOnly />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Días</Label>
                    <Input value={String(days)} readOnly />
                  </div>
                  <div className="space-y-1">
                    <Label>Importe (ARS)</Label>
                    <Input value={String(price)} readOnly />
                  </div>
                </div>

                <Button className="w-full" onClick={() => void handleConfirm()} disabled={confirming || !canLoad}>
                  {confirming ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Confirmando…
                    </span>
                  ) : (
                    'Confirmar pago'
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

