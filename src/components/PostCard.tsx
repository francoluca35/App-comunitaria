'use client'

import Link from 'next/link'
import { DeleteOwnPostButton } from '@/components/DeleteOwnPostButton'
import { Post, useApp } from '@/app/providers'
import { Card, CardContent, CardFooter } from '@/app/components/ui/card'
import { PostPublicationActions } from '@/components/PostPublicationActions'
import { PostImageWithLightbox } from '@/components/PostImageWithLightbox'
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
  const { config } = useApp()

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
    <Card className="overflow-hidden rounded-none border-x-0 border-b border-[#CED0D4] border-t-0 bg-white shadow-sm transition-shadow sm:rounded-none sm:border sm:border-[#D8D2CC] sm:hover:shadow-md sm:hover:shadow-[#5A000E]/08">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={post.authorAvatar} />
            <AvatarFallback className="text-sm font-semibold text-[#2B2B2B] bg-[#E8E4E0]">
              {post.authorName[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#2B2B2B]">{post.authorName}</p>
            <p className="text-sm text-[#7A5C52]">{createdAtLabel}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <CategoryBadge category={post.category} />
            {getStatusBadge()}
          </div>
        </div>

        <Link href={`/post/${post.id}`} className="block">
          <h3 className="font-montserrat-only font-semibold text-[#2B2B2B] mb-1 line-clamp-2 hover:text-[#8B0015] transition-colors">
            {post.title}
          </h3>
          {post.description ? (
            <p className="text-sm text-[#2B2B2B] line-clamp-3">{post.description}</p>
          ) : null}
        </Link>
      </CardContent>

      {post.media.length > 0 ? (
        <PostImageWithLightbox media={post.media} alt={post.title} variant="feed" />
      ) : null}

      <CardFooter className="flex flex-col gap-0 border-0 bg-white px-0 py-0 sm:gap-3">
        <div className="border-b border-[#CED0D4] px-4 py-3 sm:border-b sm:border-[#CED0D4] sm:px-4 sm:py-3">
          <DeleteOwnPostButton
            postId={post.id}
            authorId={post.authorId}
            size="sm"
            className="min-h-12 w-full shrink-0 justify-center border-2 border-[#D8D2CC] bg-white text-base font-semibold text-red-700 hover:bg-red-50 sm:w-auto sm:justify-start"
          />
        </div>
        <PostPublicationActions
          postId={post.id}
          whatsappNumber={config.whatsappEnabled ? post.whatsappNumber : undefined}
          showComments={config.commentsEnabled}
        />
      </CardFooter>
    </Card>
  )
}
