'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { CategoryBadge } from '@/components/CategoryBadge'
import { Badge } from '@/app/components/ui/badge'
import { Card, CardContent } from '@/app/components/ui/card'
import { ArrowLeft, MessageCircle, ExternalLink, Send, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/DashboardLayout'
import { DeleteOwnPostButton } from '@/components/DeleteOwnPostButton'

export default function PostDetailPage() {
  const params = useParams<{ postId: string }>()
  const router = useRouter()
  const { posts, comments, addComment, currentUser, config } = useApp()

  const [commentText, setCommentText] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

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

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      toast.error('Debes iniciar sesión para comentar')
      return
    }
    if (!commentText.trim()) {
      toast.error('Escribe un comentario')
      return
    }
    addComment(post.id, commentText)
    setCommentText('')
    toast.success('Comentario agregado')
  }

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % post.images.length)
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + post.images.length) % post.images.length)

  const getStatusBadge = () => {
    if (post.status === 'pending') {
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0">
          Pendiente
        </Badge>
      )
    }
    if (post.status === 'rejected') {
      return (
        <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-0">
          Rechazada
        </Badge>
      )
    }
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-0">
        Aprobada
      </Badge>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header: atrás + título */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-xl text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="min-w-0 flex-1 text-lg font-semibold text-slate-900 dark:text-white truncate">
            Detalle
          </h1>
          <DeleteOwnPostButton postId={post.id} authorId={post.authorId} redirectTo="/" size="icon" />
        </div>

        {/* Imagen(es) */}
        {post.images.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-gray-800 shadow-xl mb-6 ring-1 ring-slate-200/50 dark:ring-gray-700/50">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={post.images[currentImageIndex]}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
            {post.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-0"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-0"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {post.images.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'w-6 bg-white'
                          : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Autor + categoría + estado */}
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="w-12 h-12 rounded-xl ring-2 ring-slate-200 dark:ring-gray-700 shrink-0">
            <AvatarImage src={post.authorAvatar} />
            <AvatarFallback className="rounded-xl text-lg">
              {post.authorName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white">
              {post.authorName}
            </p>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              {formatDistanceToNow(post.createdAt, { addSuffix: true, locale: es })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end shrink-0">
            <CategoryBadge category={post.category} />
            {getStatusBadge()}
          </div>
        </div>

        {/* Título y descripción */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 leading-tight">
            {post.title}
          </h2>
          <p className="text-slate-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {post.description}
          </p>
        </div>

        {/* Acciones: Comentarios + WhatsApp */}
        <div className="flex flex-wrap gap-3 mb-8">
          {config.commentsEnabled && (
            <Button variant="outline" className="rounded-xl" asChild>
              <a href="#comments">
                <MessageCircle className="w-4 h-4 mr-2" />
                Comentarios ({postComments.length})
              </a>
            </Button>
          )}
          {config.whatsappEnabled && post.whatsappNumber && (
            <Button
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              asChild
            >
              <a
                href={`https://wa.me/${post.whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Contactar por WhatsApp
              </a>
            </Button>
          )}
        </div>

        {/* Comentarios */}
        {config.commentsEnabled && (
          <Card className="rounded-2xl border-slate-200/80 dark:border-gray-700/80 shadow-sm" id="comments">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Comentarios ({postComments.length})
              </h3>

              {currentUser ? (
                <form onSubmit={handleSubmitComment} className="mb-6">
                  <div className="flex gap-3">
                    <Avatar className="w-10 h-10 rounded-xl shrink-0">
                      <AvatarImage src={currentUser.avatar} />
                      <AvatarFallback className="rounded-xl">{currentUser.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        placeholder="Escribe un comentario..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={3}
                        className="resize-none rounded-xl border-slate-200 dark:border-gray-700"
                      />
                      <Button type="submit" size="sm" className="rounded-xl">
                        <Send className="w-4 h-4 mr-2" />
                        Enviar
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <Card className="mb-6 rounded-xl bg-slate-50 dark:bg-gray-800/50 border-slate-200 dark:border-gray-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-slate-600 dark:text-gray-400 mb-3">Iniciá sesión para comentar</p>
                    <Button asChild className="rounded-xl">
                      <Link href="/login">Iniciar sesión</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {postComments.length === 0 ? (
                  <p className="text-center text-slate-500 dark:text-gray-400 py-8 rounded-xl bg-slate-50 dark:bg-gray-800/30">
                    No hay comentarios aún. ¡Sé el primero!
                  </p>
                ) : (
                  postComments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-10 h-10 rounded-xl shrink-0">
                        <AvatarImage src={comment.authorAvatar} />
                        <AvatarFallback className="rounded-xl">{comment.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 rounded-xl bg-slate-50 dark:bg-gray-800/50 px-4 py-3 border border-slate-100 dark:border-gray-700/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {comment.authorName}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-gray-400">
                            {formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: es })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-gray-300">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
