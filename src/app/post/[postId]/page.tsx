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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Publicación no encontrada</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Button>
        </div>
      </div>
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

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % post.images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + post.images.length) % post.images.length)
  }

  const getStatusBadge = () => {
    if (post.status === 'pending') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          Pendiente de moderación
        </Badge>
      )
    }
    if (post.status === 'rejected') {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Rechazada</Badge>
    }
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Aprobada</Badge>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg">Detalle</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        {post.images.length > 0 && (
          <div className="relative bg-black">
            <div className="aspect-square overflow-hidden">
              <img src={post.images[currentImageIndex]} alt={post.title} className="w-full h-full object-contain" />
            </div>

            {post.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {post.images.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={post.authorAvatar} />
              <AvatarFallback>{post.authorName[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium">{post.authorName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(post.createdAt, { addSuffix: true, locale: es })}
              </p>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <CategoryBadge category={post.category} />
              {getStatusBadge()}
            </div>
          </div>

          <div>
            <h1 className="text-2xl mb-3">{post.title}</h1>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.description}</p>
          </div>

          <div className="flex gap-3 pt-2">
            {config.commentsEnabled && (
              <Button variant="outline" className="flex-1" asChild>
                <a href="#comments">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Comentarios ({postComments.length})
                </a>
              </Button>
            )}

            {config.whatsappEnabled && post.whatsappNumber && (
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" asChild>
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
        </div>

        {config.commentsEnabled && (
          <div className="px-4 pb-4" id="comments">
            <h2 className="text-xl mb-4">Comentarios ({postComments.length})</h2>

            {currentUser ? (
              <form onSubmit={handleSubmitComment} className="mb-6">
                <div className="flex gap-2">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Escribe un comentario..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <Button type="submit" size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <Card className="mb-6">
                <CardContent className="p-4 text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-3">Inicia sesión para comentar</p>
                  <Button asChild>
                    <Link href="/login">Iniciar Sesión</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {postComments.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No hay comentarios aún. ¡Sé el primero en comentar!
                </p>
              ) : (
                postComments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={comment.authorAvatar} />
                      <AvatarFallback>{comment.authorName[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm">{comment.authorName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: es })}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
