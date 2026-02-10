'use client'

import { useState } from 'react'
import { useApp, Category } from './providers'
import { PostCard } from '@/components/PostCard'
import { Button } from '@/app/components/ui/button'
import { Dog, AlertTriangle, Megaphone, Package, Newspaper, Filter, ArrowLeft } from 'lucide-react'
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-2xl text-center mb-4">Comunidad</h1>

        </div>
      </div>

      <div className="px-0 py-0">
        {selectedCategory === null ? (
          <div
            className="min-h-screen w-full flex items-center justify-center bg-center bg-no-repeat bg-cover"
            style={{ backgroundImage: "url('/Assets/fondo.png')" }}
          >
            <div className="grid grid-cols-2 gap-5 w-full max-w-sm">
              {CATEGORY_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  variant="outline"
                  size="lg"
                  onClick={() => setSelectedCategory(filter.value)}
                  className="w-full aspect-square flex flex-col items-center justify-center gap-10 text-base sm:text-lg"
                >
                  {filter.icon}
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedCategory(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a categorías
              </Button>
            </div>
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
