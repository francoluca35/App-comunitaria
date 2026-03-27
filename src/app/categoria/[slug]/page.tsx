'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useApp, type Category } from '@/app/providers'
import { PostCard } from '@/components/PostCard'
import { Button } from '@/app/components/ui/button'
import { Filter, ArrowLeft } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'

export default function CategoriaPage() {
  const params = useParams<{ slug: string }>()
  const { posts, currentUser, postCategories } = useApp()

  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug
  const isTodas = slug === 'todas'
  const knownSlug = !isTodas && postCategories.some((c) => c.slug === slug)
  const category: Category | 'all' | undefined = isTodas ? 'all' : knownSlug ? slug : undefined

  if (category === undefined) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-slate-500 dark:text-gray-400 mb-4">Categoría no encontrada</p>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const approvedPosts = posts.filter((p) => p.status === 'approved')
  const myPendingInCategory =
    currentUser
      ? posts.filter(
          (p) =>
            p.status === 'pending' &&
            p.authorId === currentUser.id &&
            (category === 'all' || p.category === category)
        )
      : []
  const visibleApproved =
    category === 'all' ? approvedPosts : approvedPosts.filter((p) => p.category === category)
  const filteredPosts = [...myPendingInCategory, ...visibleApproved].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const title =
    category === 'all'
      ? 'Todas'
      : postCategories.find((c) => c.slug === category)?.label ?? category

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{title}</h1>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white dark:bg-gray-800/80 border border-slate-200/80 dark:border-gray-700/80">
            <div className="w-16 h-16 bg-slate-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-gray-400">No hay publicaciones en esta categoría</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/">Ver todas</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} showStatus />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
