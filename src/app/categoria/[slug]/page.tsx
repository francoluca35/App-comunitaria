'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useApp, Category } from '@/app/providers'
import { PostCard } from '@/components/PostCard'
import { Button } from '@/app/components/ui/button'
import { ArrowLeft, Filter } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'

const SLUG_TO_CATEGORY: Record<string, Category | 'all'> = {
  todas: 'all',
  mascotas: 'mascotas',
  alertas: 'alertas',
  avisos: 'avisos',
  objetos: 'objetos',
  noticias: 'noticias',
}

const CATEGORY_LABELS: Record<Category | 'all', string> = {
  all: 'Todas',
  mascotas: 'Mascotas',
  alertas: 'Alertas',
  avisos: 'Avisos',
  objetos: 'Objetos',
  noticias: 'Noticias',
}

export default function CategoriaPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const { posts } = useApp()

  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug
  const category = SLUG_TO_CATEGORY[slug]

  if (category === undefined) {
    return (
      <div className="min-h-screen pb-20 flex flex-col bg-white dark:bg-gray-900">
        <div className="max-w-2xl mx-auto w-full px-4 py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Categoría no encontrada</p>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Link>
          </Button>
        </div>
        <BottomNav />
      </div>
    )
  }

  const approvedPosts = posts.filter((p) => p.status === 'approved')
  const filteredPosts =
    category === 'all' ? approvedPosts : approvedPosts.filter((p) => p.category === category)
  const title = CATEGORY_LABELS[category]

  return (
    <div className="min-h-screen pb-20 flex flex-col bg-white dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 -ml-2"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Volver
          </Button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-gray-50 dark:bg-gray-800">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">No hay publicaciones en esta categoría</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
