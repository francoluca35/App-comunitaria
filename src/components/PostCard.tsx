import Link from 'next/link'
import { MessageCircle, ExternalLink } from 'lucide-react'
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

  return (
    <Card className="overflow-hidden">
      {post.images.length > 0 && (
        <Link href={`/post/${post.id}`}>
          <div className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <img
              src={post.images[0]}
              alt={post.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
      )}

      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.authorAvatar} />
            <AvatarFallback>{post.authorName[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-sm">{post.authorName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(post.createdAt, { addSuffix: true, locale: es })}
            </p>
          </div>

          <div className="flex gap-2">
            <CategoryBadge category={post.category} />
            {getStatusBadge()}
          </div>
        </div>

        <Link href={`/post/${post.id}`} className="block">
          <h3 className="mb-2 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{post.description}</p>
        </Link>
      </CardContent>

      <CardFooter className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 flex gap-2">
        <Button variant="outline" size="sm" asChild className="flex-1">
          <Link href={`/post/${post.id}`}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Comentar
          </Link>
        </Button>

        {post.whatsappNumber && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="flex-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            <a href={`https://wa.me/${post.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              WhatsApp
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
