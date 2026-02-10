'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp, Post } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { CategoryBadge } from '@/components/CategoryBadge'
import { Badge } from '@/app/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { ArrowLeft, CheckCircle, XCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

export default function AdminModerationPage() {
  const router = useRouter()
  const { currentUser, posts, updatePostStatus, deletePost } = useApp()
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [rejectedImageIndices, setRejectedImageIndices] = useState<number[]>([])

  if (!currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No tienes permisos de administrador</p>
            <Button onClick={() => router.push('/')}>Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pendingPosts = posts.filter((p) => p.status === 'pending')
  const approvedPosts = posts.filter((p) => p.status === 'approved')
  const rejectedPosts = posts.filter((p) => p.status === 'rejected')

  const handleApprovePost = (post: Post) => {
    updatePostStatus(post.id, 'approved')
    toast.success('Publicación aprobada')
    setSelectedPost(null)
  }

  const handleRejectPost = (post: Post) => {
    updatePostStatus(post.id, 'rejected', rejectedImageIndices.length > 0 ? rejectedImageIndices : undefined)
    toast.success(
      rejectedImageIndices.length > 0
        ? 'Publicación aprobada con imágenes rechazadas eliminadas'
        : 'Publicación rechazada'
    )
    setSelectedPost(null)
    setRejectedImageIndices([])
  }

  const handleDeletePost = (post: Post) => {
    if (confirm('¿Estás seguro de eliminar esta publicación permanentemente?')) {
      deletePost(post.id)
      toast.success('Publicación eliminada')
      setSelectedPost(null)
    }
  }

  const toggleRejectImage = (index: number) => {
    setRejectedImageIndices((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  const nextImage = () => {
    if (selectedPost) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedPost.images.length)
    }
  }

  const prevImage = () => {
    if (selectedPost) {
      setCurrentImageIndex((prev) => (prev - 1 + selectedPost.images.length) % selectedPost.images.length)
    }
  }

  const PostListItem = ({ post }: { post: Post }) => (
    <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedPost(post)}>
      <div className="flex gap-3 p-3">
        {post.images.length > 0 && (
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
            <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <h3 className="text-sm line-clamp-2 flex-1">{post.title}</h3>
            <CategoryBadge category={post.category} />
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mb-2">{post.description}</p>

          <div className="flex items-center gap-2">
            <Avatar className="w-5 h-5">
              <AvatarImage src={post.authorAvatar} />
              <AvatarFallback className="text-xs">{post.authorName[0]}</AvatarFallback>
            </Avatar>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {post.authorName} · {formatDistanceToNow(post.createdAt, { addSuffix: true, locale: es })}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg">Moderación</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="pending">Pendientes ({pendingPosts.length})</TabsTrigger>
            <TabsTrigger value="approved">Aprobadas ({approvedPosts.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rechazadas ({rejectedPosts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {pendingPosts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No hay publicaciones pendientes</p>
                </CardContent>
              </Card>
            ) : (
              pendingPosts.map((post) => <PostListItem key={post.id} post={post} />)
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-3">
            {approvedPosts.map((post) => (
              <PostListItem key={post.id} post={post} />
            ))}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3">
            {rejectedPosts.map((post) => (
              <PostListItem key={post.id} post={post} />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={selectedPost !== null}
        onOpenChange={() => {
          setSelectedPost(null)
          setRejectedImageIndices([])
          setCurrentImageIndex(0)
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="flex-1">{selectedPost.title}</span>
                  {selectedPost.status === 'pending' && (
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                      Pendiente
                    </Badge>
                  )}
                  {selectedPost.status === 'approved' && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      Aprobada
                    </Badge>
                  )}
                  {selectedPost.status === 'rejected' && (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Rechazada</Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={selectedPost.authorAvatar} />
                      <AvatarFallback className="text-xs">{selectedPost.authorName[0]}</AvatarFallback>
                    </Avatar>
                    <span>{selectedPost.authorName}</span>
                    <span>·</span>
                    <CategoryBadge category={selectedPost.category} />
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedPost.images.length > 0 && (
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <div className="aspect-video">
                      <img
                        src={selectedPost.images[currentImageIndex]}
                        alt={selectedPost.title}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {selectedPost.images.length > 1 && (
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

                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 px-2 py-1 rounded text-white text-xs">
                          {currentImageIndex + 1} / {selectedPost.images.length}
                        </div>
                      </>
                    )}

                    {selectedPost.status === 'pending' && selectedPost.images.length > 0 && (
                      <div className="absolute top-2 right-2">
                        <Button
                          size="sm"
                          variant={rejectedImageIndices.includes(currentImageIndex) ? 'destructive' : 'secondary'}
                          onClick={() => toggleRejectImage(currentImageIndex)}
                        >
                          {rejectedImageIndices.includes(currentImageIndex) ? (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Imagen marcada
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Rechazar imagen
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {selectedPost.description}
                  </p>
                </div>

                {selectedPost.whatsappNumber && (
                  <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">WhatsApp: </span>
                    <span className="text-green-600 dark:text-green-400">{selectedPost.whatsappNumber}</span>
                  </div>
                )}

                {rejectedImageIndices.length > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-900 dark:text-red-300">
                    {rejectedImageIndices.length} imagen(es) marcada(s) para rechazo
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-col gap-2">
                {selectedPost.status === 'pending' && (
                  <>
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleApprovePost(selectedPost)}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {rejectedImageIndices.length > 0 ? 'Aprobar (sin imágenes rechazadas)' : 'Aprobar Publicación'}
                    </Button>
                    <Button variant="destructive" className="w-full" onClick={() => handleRejectPost(selectedPost)}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazar Publicación
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  className="w-full text-red-600 dark:text-red-400"
                  onClick={() => handleDeletePost(selectedPost)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Permanentemente
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
