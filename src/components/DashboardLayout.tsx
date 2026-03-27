'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, Megaphone } from 'lucide-react'
import { DashboardSidebar } from './DashboardSidebar'
import { NotificationBell } from './NotificationBell'
import { PublicidadContactLinks } from '@/components/PublicidadContactLinks'
import { PublicidadModal } from '@/components/PublicidadModal'
import type { PublicidadDisplay } from '@/lib/publicidad-display'
import { useApp } from '@/app/providers'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [lateralAds, setLateralAds] = useState<PublicidadDisplay[]>([])
  const [lateralLoaded, setLateralLoaded] = useState(false)
  const [lateralDetail, setLateralDetail] = useState<PublicidadDisplay | null>(null)
  const { currentUser } = useApp()

  useEffect(() => {
    let cancelled = false
    fetch('/api/publicidad/activos?lateral=1')
      .then(async (res) => {
        if (!res.ok) return []
        const data = (await res.json().catch(() => [])) as unknown
        if (!Array.isArray(data)) return []
        return data as Record<string, unknown>[]
      })
      .then((rows) => {
        if (cancelled) return
        const list: PublicidadDisplay[] = rows.map((r) => ({
          id: String(r.id ?? ''),
          title: String(r.title ?? ''),
          description: String(r.description ?? ''),
          category: String(r.category ?? ''),
          createdAt: new Date(
            typeof r.createdAt === 'string' || typeof r.createdAt === 'number' ? r.createdAt : Date.now()
          ),
          imageUrl: typeof r.imageUrl === 'string' ? r.imageUrl : undefined,
          images: Array.isArray(r.images)
            ? (r.images as unknown[]).filter((x): x is string => typeof x === 'string')
            : undefined,
          whatsappUrl: typeof r.whatsappUrl === 'string' ? r.whatsappUrl : undefined,
          instagramUrl: typeof r.instagramUrl === 'string' ? r.instagramUrl : undefined,
        }))
        setLateralAds(list)
      })
      .catch(() => {
        if (!cancelled) setLateralAds([])
      })
      .finally(() => {
        if (!cancelled) setLateralLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#84041c]">
      <PublicidadModal
        open={!!lateralDetail}
        onOpenChange={(open) => !open && setLateralDetail(null)}
        publicidad={lateralDetail}
      />
      {/* Sidebar izquierdo: fijo en desktop, overlay en móvil */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 lg:block ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
      >
        <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Centro: feed con ancho acotado (ml-64 en desktop por sidebar fijo) */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full lg:ml-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 py-3 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-gray-800 lg:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-semibold text-slate-900 dark:text-white">Difusión Comunitaria</span>
          </div>
          <div className="flex items-center gap-1">
            {currentUser && <NotificationBell />}
            <Link
              href="/publicidades"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/25 text-sm font-medium"
              aria-label="Publicidades"
            >
              <Megaphone className="w-4 h-4" />
              <span>Publicidades</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto flex justify-center">
          <div className="w-full max-w-2xl">
            {children}
          </div>
        </main>
      </div>

      {/* Columna fija: publicidades con opción “barra lateral” (solo desktop) */}
      <aside className="hidden xl:block w-[280px] shrink-0 border-l border-slate-200/80 dark:border-gray-800 bg-slate-100/50 dark:bg-gray-900/50 overflow-y-auto">
        <div className="sticky top-0 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">
              Publicidad
            </h3>
            <Link
              href="/publicidades"
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
            >
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {!lateralLoaded ? (
              <div className="flex justify-center py-8 text-slate-400 text-sm">Cargando…</div>
            ) : lateralAds.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-gray-400 py-2">
                Todavía no hay publicidades con esta opción activas.
              </p>
            ) : (
              lateralAds.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl bg-white dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setLateralDetail(p)}
                    className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 rounded-t-xl"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-slate-200 dark:bg-gray-700">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Megaphone className="w-10 h-10 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">{p.title}</p>
                    </div>
                  </button>
                  <div className="px-2.5 pb-2.5">
                    <PublicidadContactLinks
                      whatsappUrl={p.whatsappUrl}
                      instagramUrl={p.instagramUrl}
                      size="sidebar"
                      stopPropagationOnClick
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
