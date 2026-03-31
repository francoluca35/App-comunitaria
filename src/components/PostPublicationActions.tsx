'use client'

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/app/components/ui/utils'

function WhatsAppMark({ className }: { className?: string }) {
  return (
    <svg className={cn('shrink-0', className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

const touchRow = 'flex flex-col gap-3 sm:flex-row sm:items-stretch'

const commentBtn =
  '!h-auto min-h-[52px] w-full justify-center gap-3 rounded-xl border-2 border-[#6b0010] bg-[#8B0015] px-4 py-3.5 text-base font-semibold leading-tight text-white shadow-md transition-colors hover:bg-[#5A000E] hover:text-white focus-visible:ring-[3px] focus-visible:ring-[#8B0015]/50 focus-visible:ring-offset-2 sm:min-h-14 sm:py-4 sm:text-lg'

const waBtn =
  '!h-auto min-h-[52px] w-full justify-center gap-3 rounded-xl border-2 border-[#0d8f4f] bg-[#25D366] px-4 py-3.5 text-base font-semibold leading-tight text-white shadow-md transition-colors hover:bg-[#20bd5a] hover:text-white focus-visible:ring-[3px] focus-visible:ring-[#128C4A]/45 focus-visible:ring-offset-2 sm:min-h-14 sm:py-4 sm:text-lg'

export type PostPublicationActionsProps = {
  postId: string
  whatsappNumber?: string | null | undefined
  className?: string
  /** En el detalle del post usar "#comments" */
  commentsHref?: string
  showComments?: boolean
  commentsLabel?: string
}

export function PostPublicationActions({
  postId,
  whatsappNumber,
  className,
  commentsHref: commentsHrefProp,
  showComments = true,
  commentsLabel = 'Comentar',
}: PostPublicationActionsProps) {
  const wa = whatsappNumber?.replace(/\D/g, '') ?? ''
  const hasWa = wa.length > 0
  const commentsHref = commentsHrefProp ?? `/post/${postId}`
  const isHashLink = commentsHref.startsWith('#')

  if (!showComments && !hasWa) return null

  const commentFlex = showComments && hasWa

  const commentTrigger = (
    <>
      <MessageCircle className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" strokeWidth={2.5} aria-hidden />
      <span className="text-center">{commentsLabel}</span>
    </>
  )

  return (
    <div
      role="group"
      aria-label="Acciones de la publicación"
      className={cn(touchRow, className)}
    >
      {showComments ? (
        <Button asChild variant="ghost" className={cn(commentBtn, commentFlex ? 'sm:flex-1' : '')}>
          {isHashLink ? (
            <a href={commentsHref} className="inline-flex items-center justify-center gap-3">
              {commentTrigger}
            </a>
          ) : (
            <Link href={commentsHref} className="inline-flex items-center justify-center gap-3">
              {commentTrigger}
            </Link>
          )}
        </Button>
      ) : null}
      {hasWa ? (
        <Button asChild variant="ghost" className={cn(waBtn, showComments ? 'sm:flex-1' : '')}>
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3"
          >
            <WhatsAppMark className="h-7 w-7 sm:h-8 sm:w-8" />
            <span className="text-center">Contactar por WhatsApp</span>
          </a>
        </Button>
      ) : null}
    </div>
  )
}
