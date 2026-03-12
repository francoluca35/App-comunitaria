'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { PostCard } from '@/components/PostCard'
import { Button } from '@/app/components/ui/button'
import { FileText } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'

export default function MisPublicacionesPage() {
  const router = useRouter()
  const { posts, currentUser, authLoading } = useApp()

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login')
    }
  }, [authLoading, currentUser, router])

  if (!currentUser) {
    return null
  }

  const myPosts = posts.filter((p) => p.authorId === currentUser.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Mis publicaciones</h1>

        {myPosts.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white dark:bg-gray-800/80 border border-slate-200/80 dark:border-gray-700/80">
            <div className="w-16 h-16 bg-slate-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-gray-400 mb-2">Aún no tenés publicaciones</p>
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">Creá una desde Inicio para que la comunidad la vea.</p>
            <Button asChild>
              <Link href="/create">Crear publicación</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {myPosts.map((post) => (
              <PostCard key={post.id} post={post} showStatus />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
