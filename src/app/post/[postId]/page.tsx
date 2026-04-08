'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { Badge } from '@/app/components/ui/badge'
import { PostAuthorNameCategoryRow } from '@/components/PostAuthorNameCategoryRow'
import { Card, CardContent } from '@/app/components/ui/card'
import { ArrowLeft, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/DashboardLayout'
import { DeleteOwnPostButton } from '@/components/DeleteOwnPostButton'
import { PostPublicationActions } from '@/components/PostPublicationActions'
import { PostImageWithLightbox } from '@/components/PostImageWithLightbox'

export default function PostDetailPage() {
  const params = useParams<{ postId: string }>()
  const router = useRouter()
  const { posts, comments, addComment, currentUser, config } = useApp()

  const [commentText, setCommentText] = useState('')

  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId
  const post = posts.find((p) => p.id === postId)
  const postComments = comments.filter((c) => c.postId === postId)

  if (!post) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <p className="text-slate-500 dark:text-gray-400 mb-6">Publicación no encontrada</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      toast.error('Debés iniciar sesión para comentar')
      return
    }
    if (!commentText.trim()) {
      toast.error('Escribí un comentario')
      return
    }
    const result = await addComment(post.id, commentText)
    if (!result.ok) {
      toast.error(result.error ?? 'No se pudo publicar')
      return
    }
    setCommentText('')
    toast.success('Comentario agregado')
  }

  const statusBadge =
    post.status === 'pending' ? (
      <Badge className="border-0 bg-amber-500/15 text-amber-700 dark:text-amber-300">Pendiente</Badge>
    ) : post.status === 'rejected' ? (
      <Badge className="border-0 bg-rose-500/15 text-rose-700 dark:text-rose-300">Rechazada</Badge>
    ) : null

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto px-1">
        {/* Header: atrás + título */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 rounded-lg text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-[#2B2B2B]">
            Detalle
          </h1>
          <DeleteOwnPostButton postId={post.id} authorId={post.authorId} redirectTo="/" size="icon" />
        </div>

        {/* Arriba: autor y texto */}
        <div className="mb-2 flex items-start gap-2.5">
          <Avatar className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-slate-200 dark:ring-gray-700">
            <AvatarImage src={post.authorAvatar} />
            <AvatarFallback className="rounded-lg text-sm">{post.authorName[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <PostAuthorNameCategoryRow
              authorName={post.authorName}
              category={post.category}
              statusBadge={statusBadge}
              nameClassName="text-sm font-semibold"
            />
            <p className="mt-0.5 text-xs leading-tight text-slate-500 dark:text-gray-400">
              {formatDistanceToNow(post.createdAt, { addSuffix: true, locale: es })}
            </p>
          </div>
        </div>

        <div className="mb-3">
          <h2 className="mb-1 text-lg font-bold leading-snug text-[#2B2B2B]">
            {post.title}
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-snug text-[#2B2B2B]">
            {post.description}
          </p>
        </div>

        {/* Imagen(es) al medio */}
        {post.media.length > 0 ? (
          <div className="mb-3">
            <PostImageWithLightbox
              media={post.media}
              alt={post.title}
              variant="detail"
              priority
            />
          </div>
        ) : null}

        {/* Acciones + comentarios */}
        <div className="mb-3 overflow-hidden rounded-lg border border-[#CED0D4] bg-white p-0 sm:border-[#D8D2CC] sm:bg-[#F4EFEA] sm:p-1">
          <PostPublicationActions
            postId={post.id}
            whatsappNumber={config.whatsappEnabled ? post.whatsappNumber : undefined}
            showComments={config.commentsEnabled}
            commentsHref="#comments"
            commentCount={config.commentsEnabled ? postComments.length : undefined}
            compact
          />
        </div>

        {config.commentsEnabled && (
          <Card className="rounded-xl border-slate-200/80 dark:border-gray-700/80 shadow-sm" id="comments">
            <CardContent className="p-3 sm:p-4">
              <h3 className="mb-2 text-sm font-semibold text-card-foreground">
                Comentarios ({postComments.length})
              </h3>

              <div className="space-y-2 mb-3">
                {postComments.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 dark:text-gray-400 py-4 rounded-lg bg-slate-50 dark:bg-gray-800/30">
                    No hay comentarios aún. ¡Sé el primero!
                  </p>
                ) : (
                  postComments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar className="w-8 h-8 rounded-lg shrink-0">
                        <AvatarImage src={comment.authorAvatar} />
                        <AvatarFallback className="rounded-lg text-xs">{comment.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 rounded-lg bg-slate-50 dark:bg-gray-800/50 px-2.5 py-2 border border-slate-100 dark:border-gray-700/50">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-xs font-medium text-slate-900 dark:text-white">
                            {comment.authorName}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-gray-400">
                            {formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: es })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-gray-300 leading-snug">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {currentUser ? (
                <form onSubmit={(e) => void handleSubmitComment(e)}>
                  <div className="flex gap-2">
                    <Avatar className="w-8 h-8 rounded-lg shrink-0">
                      <AvatarImage src={currentUser.avatar} />
                      <AvatarFallback className="rounded-lg text-xs">{currentUser.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1.5">
                      <Textarea
                        placeholder="Escribí un comentario…"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={2}
                        className="min-h-0 resize-none rounded-lg border-slate-200 dark:border-gray-700 text-sm py-2"
                      />
                      <Button type="submit" size="sm" className="h-8 rounded-lg text-xs">
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Enviar
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <Card className="rounded-lg bg-slate-50 dark:bg-gray-800/50 border-slate-200 dark:border-gray-700">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-slate-600 dark:text-gray-400 mb-2">
                      Iniciá sesión para dejar un comentario
                    </p>
                    <Button asChild size="sm" className="h-8 rounded-lg text-xs">
                      <Link href="/login">Iniciar sesión</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
