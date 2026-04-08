'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Megaphone, ArrowLeft, Filter, Search } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { matchesPublicidadSearch } from '@/lib/community-search'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import { OPCION_TODAS } from '@/lib/categorias-publicidad'
import { sanitizeCategoryRows } from '@/lib/category-defaults'
import { useApp } from '@/app/providers'
import type { PublicidadDisplay } from '@/lib/publicidad-display'
import { PublicidadModal } from '@/components/PublicidadModal'
import { PublicidadFeedCard } from '@/components/PublicidadFeedCard'

type SortOrder = 'reciente' | 'antiguo'

function parsePublicidadCreatedAt(raw: unknown): Date {
  if (raw == null) return new Date(0)
  const d = new Date(typeof raw === 'string' || typeof raw === 'number' ? raw : '')
  return Number.isFinite(d.getTime()) ? d : new Date(0)
}

export default function PublicidadesPage() {
  const { publicidadCategories, refreshPublicidadCategories } = useApp()
  const pubCats = useMemo(() => sanitizeCategoryRows(publicidadCategories), [publicidadCategories])
  const [publicidades, setPublicidades] = useState<PublicidadDisplay[]>([])
  const [searchQuery, setSearchQuery] = useState('')
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
          createdAt: parsePublicidadCreatedAt(r.createdAt),
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
      ...pubCats
        .filter((c) => c.slug !== 'all')
        .map((c) => ({ value: c.slug, label: c.label })),
    ],
    [pubCats]
  )
  const [searchVisible, setSearchVisible] = useState(false)
  const [selectedPublicidad, setSelectedPublicidad] = useState<PublicidadDisplay | null>(null)

  const filteredAndSorted = useMemo(() => {
    let list = [...publicidades]

    list = list.filter((p) =>
      matchesPublicidadSearch(
        p,
        searchQuery,
        pubCats.find((c) => c.slug === p.category)?.label
      )
    )

    if (categoryFilter !== 'all') {
      list = list.filter((p) => p.category === categoryFilter)
    }

    list.sort((a, b) => {
      const tA = Number.isFinite(a.createdAt.getTime()) ? a.createdAt.getTime() : 0
      const tB = Number.isFinite(b.createdAt.getTime()) ? b.createdAt.getTime() : 0
      return sortOrder === 'reciente' ? tB - tA : tA - tB
    })

    return list
  }, [searchQuery, categoryFilter, sortOrder, publicidades, pubCats])

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

        <ul className="m-0 flex list-none flex-col gap-5 p-0 sm:gap-5">
          {filteredAndSorted.length === 0 ? (
            <li className="rounded-xl border border-slate-200 bg-slate-100 p-8 text-center dark:border-gray-700 dark:bg-gray-800/80">
              <Megaphone className="mx-auto mb-2 h-10 w-10 text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-gray-400">
                No hay publicidades con ese filtro o búsqueda.
              </p>
            </li>
          ) : (
            filteredAndSorted.map((p, index) => {
              const pubCatLabel = pubCats.find((c) => c.slug === p.category)?.label ?? p.category
              return (
                <li key={p.id}>
                  <PublicidadFeedCard
                    publicidad={p}
                    categoryLabel={pubCatLabel}
                    onOpenDetail={() => setSelectedPublicidad(p)}
                    imagePriority={index < 2}
                  />
                </li>
              )
            })
          )}
        </ul>
      </div>
    </DashboardLayout>
  )
}
