'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Megaphone, ArrowLeft, Filter, Search, MessageCircle, Instagram } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import { CATEGORIAS_PUBLICIDAD, OPCION_TODAS } from '@/lib/categorias-publicidad'
import { DEMO_PUBLICIDADES, type DemoPublicidad } from '@/lib/demo-publicidades'
import { PublicidadModal } from '@/components/PublicidadModal'

type SortOrder = 'reciente' | 'antiguo'

type PublicidadItem = DemoPublicidad

export default function PublicidadesPage() {
  const [sortOrder, setSortOrder] = useState<SortOrder>('reciente')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchVisible, setSearchVisible] = useState(false)
  const [selectedPublicidad, setSelectedPublicidad] = useState<DemoPublicidad | null>(null)

  const filteredAndSorted = useMemo(() => {
    let list = [...DEMO_PUBLICIDADES]

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
  }, [searchQuery, categoryFilter, sortOrder])

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
                  {[OPCION_TODAS, ...CATEGORIAS_PUBLICIDAD].map((cat) => (
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
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {p.title}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                    {p.description}
                  </p>
                  {p.ctaUrl && p.ctaLabel && (
                    <a
                      href={p.ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-white text-sm transition-opacity hover:opacity-95 ${
                        p.ctaType === 'whatsapp'
                          ? 'bg-[#25D366] hover:bg-[#20BD5A]'
                          : 'bg-gradient-to-r from-[#f09433] via-[#e1306c] to-[#833ab4]'
                      }`}
                    >
                      {p.ctaType === 'whatsapp' ? (
                        <MessageCircle className="w-5 h-5" />
                      ) : (
                        <Instagram className="w-5 h-5" />
                      )}
                      {p.ctaLabel}
                    </a>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
