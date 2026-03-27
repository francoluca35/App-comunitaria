'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/app/providers'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Megaphone, ArrowRight, Loader2, Download, Pencil } from 'lucide-react'
import { toast } from 'sonner'

type PublicidadStatus = 'pending' | 'payment_pending' | 'active' | 'rejected'

type MisPublicidad = {
  id: string
  title: string
  description: string
  category: string
  images: string[]
  status: PublicidadStatus
  created_at: string
  start_at: string | null
  end_at: string | null
  payment_link_url: string | null
  days_left: number
}

function formatStatus(status: PublicidadStatus) {
  if (status === 'active') return 'Activa'
  if (status === 'payment_pending') return 'Pendiente de pago'
  if (status === 'rejected') return 'Rechazada'
  return 'En revisión'
}

export default function MisPublicidadesPage() {
  const router = useRouter()
  const { currentUser, publicidadCategories } = useApp()

  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<MisPublicidad[]>([])
  const [inactive, setInactive] = useState<MisPublicidad[]>([])
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login')
      return
    }
  }, [currentUser, router])

  const categoryBySlug = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of publicidadCategories) map.set(c.slug, c.label)
    return map
  }, [publicidadCategories])

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = (await import('@/lib/supabase/client')).createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return

        const res = await fetch('/api/publicidad/mis', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('No se pudo cargar')
        const data = await res.json().catch(() => ({})) as { active?: MisPublicidad[]; inactive?: MisPublicidad[] }
        setActive(Array.isArray(data.active) ? data.active : [])
        setInactive(Array.isArray(data.inactive) ? data.inactive : [])
      } catch {
        toast.error('No se pudieron cargar tus publicidades')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const downloadComprobante = async (id: string) => {
    try {
      setDownloadingId(id)
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        toast.error('Sesión expirada')
        return
      }
      const res = await fetch(`/api/publicidad/comprobante/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error ?? 'No se pudo descargar')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comprobante-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setDownloadingId(null)
    }
  }

  if (!currentUser) return null

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto pb-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mis publicidades</h1>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/publicidades/crear">
              Crear
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
          </div>
        ) : active.length === 0 && inactive.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white dark:bg-gray-800/80 border border-slate-200/80 dark:border-gray-700/80">
            <div className="w-16 h-16 bg-slate-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-gray-400 mb-2">Aún no tenés publicidades</p>
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">Creá una desde el botón “Crear”.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Activas
              </h2>
              {active.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-gray-400">No hay publicidades activas.</div>
              ) : (
                <div className="space-y-3">
                  {active.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="p-4 flex gap-4">
                        <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <Megaphone className="w-7 h-7 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.title}</p>
                              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                                {categoryBySlug.get(p.category) ?? p.category} · {p.days_left} días restantes
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 shrink-0 justify-end">
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/mis-publicidades/${p.id}/editar`}>
                                  <Pencil className="w-4 h-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Editar</span>
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={downloadingId === p.id}
                                onClick={() => void downloadComprobante(p.id)}
                              >
                                {downloadingId === p.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                                <span className="ml-2 hidden sm:inline">Descargar comprobante</span>
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-gray-300 mt-2 line-clamp-2">{p.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Sin funcionamiento
              </h2>
              {inactive.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-gray-400">No hay publicidades sin funcionamiento.</div>
              ) : (
                <div className="space-y-3">
                  {inactive.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="p-4 flex gap-4">
                        <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <Megaphone className="w-7 h-7 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.title}</p>
                              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                                {categoryBySlug.get(p.category) ?? p.category} · {formatStatus(p.status)}
                              </p>
                            </div>
                            {p.payment_link_url && p.status === 'payment_pending' && (
                              <Button asChild size="sm" variant="outline" className="shrink-0">
                                <a href={p.payment_link_url} target="_blank" rel="noopener noreferrer">
                                  Pagar
                                </a>
                              </Button>
                            )}
                            {(p.status === 'pending' || p.status === 'rejected' || p.status === 'payment_pending') && (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="shrink-0"
                              >
                                <Link href={`/mis-publicidades/${p.id}/editar`}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar
                                </Link>
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-gray-300 mt-2 line-clamp-2">{p.description}</p>
                          {p.end_at && p.status !== 'payment_pending' && (
                            <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">
                              Finalizó: {new Date(p.end_at).toLocaleDateString('es-AR')}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

