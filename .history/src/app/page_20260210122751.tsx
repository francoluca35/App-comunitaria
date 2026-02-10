'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useApp, Category } from './providers'
import { PostCard } from '@/components/PostCard'
import { Button } from '@/app/components/ui/button'
import { Dog, AlertTriangle, Megaphone, Package, Newspaper, Filter, ArrowLeft, Home, PlusCircle, User, LayoutDashboard } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'

const CATEGORY_FILTERS: { value: Category | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'TODOS', icon: <Filter className="w-5 h-5" /> },
  { value: 'mascotas', label: 'Mascotas', icon: <Dog className="w-5 h-5" /> },
  { value: 'alertas', label: 'Alertas', icon: <AlertTriangle className="w-5 h-5" /> },
  { value: 'avisos', label: 'Avisos', icon: <Megaphone className="w-5 h-5" /> },
  { value: 'objetos', label: 'Objetos', icon: <Package className="w-5 h-5" /> },
  { value: 'noticias', label: 'Noticias', icon: <Newspaper className="w-5 h-5" /> },
]

export default function HomePage() {
  const { posts, currentUser } = useApp()
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all' | null>(null)

  const approvedPosts = posts.filter((p) => p.status === 'approved')
  const filteredPosts =
    selectedCategory === 'all' ? approvedPosts : approvedPosts.filter((p) => p.category === selectedCategory)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 flex flex-col">
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shrink-0">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-center relative">
          {selectedCategory !== null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Volver
            </Button>
          )}
          <h1 className="text-2xl font-semibold">Comunidad</h1>
        </div>
      </div>

      <div className="px-0 py-0 flex-1 flex flex-col min-h-0">
        {selectedCategory === null ? (
          <div
            className="w-full flex-1 flex items-center justify-center bg-center bg-no-repeat bg-cover min-h-0 max-h-[calc(100vh-10rem)]"
            style={{ backgroundImage: "url('/Assets/fondo.png')" }}
          >
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm px-4">
              {CATEGORY_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  variant="outline"
                  onClick={() => setSelectedCategory(filter.value)}
                  className="
                    h-20 sm:h-24
                    flex flex-col items-center justify-center
                    gap-1
                    text-base font-medium
                    rounded-2xl
                    shadow-sm
                  "
                >
                  <span className="text-xl sm:text-2xl">
                    {filter.icon}
                  </span>
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {currentUser && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-900 dark:text-blue-300">
                <p>
                  ¡Hola, <strong>{currentUser.name}</strong>! 👋
                </p>
                <p className="text-xs mt-1 text-blue-700 dark:text-blue-400">
                  Bienvenido a la plataforma de difusión comunitaria
                </p>
              </div>
            )}

            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Filter className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">No hay publicaciones en esta categoría</p>
                </div>
              ) : (
                filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
