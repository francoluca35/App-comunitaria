import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, ExternalLink, ImageOff } from 'lucide-react'
import { Post } from '@/app/providers'
import { Card, CardContent, CardFooter } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { CategoryBadge } from './CategoryBadge'
import { Badge } from '@/app/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface PostCardProps {
  post: Post
  showStatus?: boolean
}

export function PostCard({ post, showStatus = false }: PostCardProps) {
  const [imageError, setImageError] = useState(false)
  const getStatusBadge = () => {
    if (post.status === 'pending') {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          Pendiente
        </Badge>
      )
    }
    if (post.status === 'rejected') {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          Rechazada
        </Badge>
      )
    }
    if (showStatus) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          Aprobada
        </Badge>
      )
    }
    return null
  }

  const createdAtLabel = formatDistanceToNow(post.createdAt, { addSuffix: true, locale: es })

  return (
    <Card className="overflow-hidden">
      {post.images.length > 0 && (
        <Link href={`/post/${post.id}`}>
          <div className="aspect-video bg-slate-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
            {imageError ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                <ImageOff className="w-12 h-12" />
                <span className="text-sm">Imagen no disponible</span>
              </div>
            ) : (
              <img
                src={post.images[0]}
                alt={post.title}
                className="w-full h-full object-cover hover:opacity-95 transition-opacity"
                onError={() => setImageError(true)}
              />
            )}
          </div>
        </Link>
      )}
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={post.authorAvatar} />
            <AvatarFallback className="text-sm">{post.authorName[0]?.toUpperCase() ?? '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 dark:text-white">{post.authorName}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{createdAtLabel}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <CategoryBadge category={post.category} />
            {getStatusBadge()}
          </div>
        </div>

        <Link href={`/post/${post.id}`} className="block">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1 line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{post.description}</p>
        </Link>
      </CardContent>

      <CardFooter className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50 flex gap-2">
        <Button variant="outline" size="sm" asChild className="flex-1">
          <Link href={`/post/${post.id}`}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Comentar
          </Link>
        </Button>
        {post.whatsappNumber ? (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="flex-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-800"
          >
            <a href={`https://wa.me/${post.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              WhatsApp
            </a>
          </Button>
        ) : (
          <div className="flex-1" />
        )}
      </CardFooter>
    </Card>
  )
}
