'use client'

import Link from 'next/link'
import { useApp, Category } from './providers'
import { Dog, AlertTriangle, Megaphone, Package, Newspaper, Filter, Users2, Bell, Settings } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'

const CATEGORIES: { value: Category | 'all'; slug: string; label: string; icon: React.ReactNode }[] = [
  { value: 'all', slug: 'todas', label: 'Todas', icon: <Filter className="w-6 h-6 text-gray-600" /> },
  { value: 'mascotas', slug: 'mascotas', label: 'Mascotas', icon: <Dog className="w-6 h-6 text-gray-600" /> },
  { value: 'alertas', slug: 'alertas', label: 'Alertas', icon: <AlertTriangle className="w-6 h-6 text-gray-600" /> },
  { value: 'avisos', slug: 'avisos', label: 'Avisos', icon: <Megaphone className="w-6 h-6 text-gray-600" /> },
  { value: 'objetos', slug: 'objetos', label: 'Objetos', icon: <Package className="w-6 h-6 text-gray-600" /> },
  { value: 'noticias', slug: 'noticias', label: 'Noticias', icon: <Newspaper className="w-6 h-6 text-gray-600" /> },
]

function getCategoryCount(posts: { category: Category }[], value: Category | 'all') {
  if (value === 'all') return posts.length
  return posts.filter((p) => p.category === value).length
}

export default function HomePage() {
  const { posts } = useApp()
  const approvedPosts = posts.filter((p) => p.status === 'approved')

  return (
    <div
      className="min-h-screen pb-20 flex flex-col bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 bg-cover"
    >
      {/* Header: igual a la foto */}
      <header className="bg-white/95 dark:bg-gray-950/95 backdrop-blur border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Users2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Difusión Comunitaria
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Notificaciones"
            >
              <Bell className="w-5 h-5" />
            </button>
            <Link
              href="/profile"
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Configuración"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 max-w-2xl mx-auto w-full px-4 pt-4 pb-4">
        {/* Banner Crear Publicación: gradiente azul a púrpura */}
        <Link
          href="/create"
          className="flex flex-col items-center justify-center rounded-2xl py-6 px-4 mb-6 text-white shadow-lg bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 hover:opacity-95 transition-opacity"
        >
          <span className="text-3xl font-bold mb-1">+ Crear Publicación</span>
          <span className="text-sm opacity-90">Comparte con tu comunidad</span>
        </Link>

        {/* Sección Categorías: tarjetas con icono, nombre y conteo → llevan a la página del canal */}
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Categorías</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => {
            const count = getCategoryCount(approvedPosts, cat.value)
            return (
              <Link
                key={cat.value}
                href={`/categoria/${cat.slug}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-gray-800/90 shadow-sm border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700">
                  {cat.icon}
                </span>
                <span className="font-medium text-gray-900 dark:text-white text-sm">{cat.label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {count === 1 ? '1 publicación' : `${count} publicaciones`}
                </span>
              </Link>
            )
          })}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
