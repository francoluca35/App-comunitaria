'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Megaphone, ArrowLeft, Filter, Search } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import { OPCION_TODAS } from '@/lib/categorias-publicidad'
import { useApp } from '@/app/providers'
import type { PublicidadDisplay } from '@/lib/publicidad-display'
import { PublicidadModal } from '@/components/PublicidadModal'
import { PublicidadContactLinks } from '@/components/PublicidadContactLinks'

type SortOrder = 'reciente' | 'antiguo'

export default function PublicidadesPage() {
  const { publicidadCategories, refreshPublicidadCategories } = useApp()
  const [publicidades, setPublicidades] = useState<PublicidadDisplay[]>([])
  const [sortOrder, setSortOrder] = useState<SortOrder>('reciente')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  useEffect(() => {
    void refreshPublicidadCategories()
    fetch('/api/publicidad/activos')
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json().catch(() => [])) as any[]
        if (!Array.isArray(data)) return
        if (data.length === 0) {
          setPublicidades([])
          return
        }
        const mapped: PublicidadDisplay[] = data.map((r) => ({
          id: String(r.id),
          title: String(r.title ?? ''),
          description: String(r.description ?? ''),
          category: String(r.category ?? ''),
          createdAt: new Date(r.createdAt),
          imageUrl: r.imageUrl ? String(r.imageUrl) : undefined,
          images: Array.isArray(r.images)
            ? (r.images as unknown[]).filter((x): x is string => typeof x === 'string')
            : undefined,
          whatsappUrl: typeof r.whatsappUrl === 'string' ? r.whatsappUrl : undefined,
          instagramUrl: typeof r.instagramUrl === 'string' ? r.instagramUrl : undefined,
        }))
        setPublicidades(mapped)
      })
      .catch(() => {})
  }, [refreshPublicidadCategories])

  const publicidadFilterOptions = useMemo(
    () => [
      OPCION_TODAS,
      ...publicidadCategories.map((c) => ({ value: c.slug, label: c.label })),
    ],
    [publicidadCategories]
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [searchVisible, setSearchVisible] = useState(false)
  const [selectedPublicidad, setSelectedPublicidad] = useState<PublicidadDisplay | null>(null)

  const filteredAndSorted = useMemo(() => {
    let list = [...publicidades]

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    }

    if (categoryFilter !== 'all') {
      list = list.filter((p) => p.category === categoryFilter)
    }

    list.sort((a, b) => {
      const tA = a.createdAt.getTime()
      const tB = b.createdAt.getTime()
      return sortOrder === 'reciente' ? tB - tA : tA - tB
    })

    return list
  }, [searchQuery, categoryFilter, sortOrder, publicidades])

  return (
    <DashboardLayout>
      <PublicidadModal
        open={!!selectedPublicidad}
        onOpenChange={(open) => !open && setSelectedPublicidad(null)}
        publicidad={selectedPublicidad}
      />
      <div className="max-w-2xl mx-auto p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
              Todas las publicidades
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Búsqueda: lupa que muestra input */}
            {searchVisible ? (
              <div className="flex items-center gap-1">
                <Input
                  placeholder="Ej: plomero, mecánico, flete..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40 sm:w-52 h-9 rounded-xl"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => {
                    setSearchVisible(false)
                    setSearchQuery('')
                  }}
                  aria-label="Cerrar búsqueda"
                >
                  ×
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl"
                onClick={() => setSearchVisible(true)}
                aria-label="Buscar"
              >
                <Search className="w-4 h-4" />
              </Button>
            )}

            {/* Filtro */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl" aria-label="Filtrar">
                  <Filter className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 rounded-xl p-3" align="end">
                <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Orden
                </p>
                <div className="flex gap-2 mb-3">
                  <Button
                    variant={sortOrder === 'reciente' ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-lg flex-1"
                    onClick={() => setSortOrder('reciente')}
                  >
                    Reciente
                  </Button>
                  <Button
                    variant={sortOrder === 'antiguo' ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-lg flex-1"
                    onClick={() => setSortOrder('antiguo')}
                  >
                    Antiguo
                  </Button>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Categoría
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {publicidadFilterOptions.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        categoryFilter === cat.value
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                          : 'hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-700 dark:text-gray-300'
                      }`}
                      onClick={() => setCategoryFilter(cat.value)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <p className="text-slate-600 dark:text-gray-400 text-sm mb-6">
          Acá se muestran todas las publicidades de la comunidad.
        </p>

        <div className="space-y-4">
          {filteredAndSorted.length === 0 ? (
            <div className="rounded-xl bg-slate-100 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 p-8 text-center">
              <Megaphone className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-gray-400 text-sm">
                No hay publicidades con ese filtro o búsqueda.
              </p>
            </div>
          ) : (
            filteredAndSorted.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setSelectedPublicidad(p)}
                className="w-full text-left rounded-xl bg-white dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                <div className="aspect-video rounded-t-xl overflow-hidden bg-slate-200 dark:bg-gray-700">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Megaphone className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200/90 mb-1.5 w-fit rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5">
                    {publicidadCategories.find((c) => c.slug === p.category)?.label ?? p.category}
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {p.title}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                    {p.description}
                  </p>
                  <PublicidadContactLinks
                    whatsappUrl={p.whatsappUrl}
                    instagramUrl={p.instagramUrl}
                    stopPropagationOnClick
                  />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
