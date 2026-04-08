'use client'

import Link from 'next/link'
import { MessageCircle, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/app/components/ui/utils'
import { postPermalink } from '@/lib/app-public-url'

function WhatsAppMark({ className }: { className?: string }) {
  return (
    <svg className={cn('shrink-0', className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

const touchRow =
  'flex w-full flex-row items-stretch overflow-hidden  bg-white divide-x divide-[#CED0D4]'

const commentBtn =
  '!h-auto min-h-10 min-w-0 flex-1 basis-0 justify-center gap-1.5 rounded-none border-0 bg-transparent px-2 py-2 text-[13px] font-semibold leading-tight text-[#65676B] shadow-none transition-colors hover:bg-[#F2F3F5] hover:text-[#1b74e4] focus-visible:ring-[3px] focus-visible:ring-[#1b74e4]/35 focus-visible:ring-offset-0 sm:min-h-11 sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm'

const commentBtnCompact =
  '!h-auto min-h-8 min-w-0 flex-1 basis-0 justify-center gap-1 rounded-none border-0 bg-transparent px-1.5 py-1.5 text-[12px] font-semibold leading-tight text-[#65676B] shadow-none transition-colors hover:bg-[#F2F3F5] hover:text-[#1b74e4] focus-visible:ring-[3px] focus-visible:ring-[#1b74e4]/35 focus-visible:ring-offset-0 sm:min-h-9 sm:gap-1.5 sm:px-2 sm:py-2 sm:text-[13px]'

const waBtn =
  '!h-auto min-h-10 min-w-0 flex-1 basis-0 justify-center gap-1.5 rounded-none border-0 bg-transparent px-2 py-2 text-[13px] font-semibold leading-tight text-[#65676B] shadow-none transition-colors hover:bg-[#F2F3F5] hover:text-[#1b74e4] focus-visible:ring-[3px] focus-visible:ring-[#1b74e4]/35 focus-visible:ring-offset-0 sm:min-h-11 sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm'

const waBtnCompact =
  '!h-auto min-h-8 min-w-0 flex-1 basis-0 justify-center gap-1 rounded-none border-0 bg-transparent px-1.5 py-1.5 text-[12px] font-semibold leading-tight text-[#65676B] shadow-none transition-colors hover:bg-[#F2F3F5] hover:text-[#1b74e4] focus-visible:ring-[3px] focus-visible:ring-[#1b74e4]/35 focus-visible:ring-offset-0 sm:min-h-9 sm:gap-1.5 sm:px-2 sm:py-2 sm:text-[13px]'

const shareBtn =
  '!h-auto min-h-10 min-w-0 flex-1 basis-0 justify-center gap-1.5 rounded-none border-0 bg-transparent px-2 py-2 text-[13px] font-semibold leading-tight text-[#65676B] shadow-none transition-colors hover:bg-[#F2F3F5] hover:text-[#1b74e4] focus-visible:ring-[3px] focus-visible:ring-[#1b74e4]/35 focus-visible:ring-offset-0 sm:min-h-11 sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm'

const shareBtnCompact =
  '!h-auto min-h-8 min-w-0 flex-1 basis-0 justify-center gap-1 rounded-none border-0 bg-transparent px-1.5 py-1.5 text-[12px] font-semibold leading-tight text-[#65676B] shadow-none transition-colors hover:bg-[#F2F3F5] hover:text-[#1b74e4] focus-visible:ring-[3px] focus-visible:ring-[#1b74e4]/35 focus-visible:ring-offset-0 sm:min-h-9 sm:gap-1.5 sm:px-2 sm:py-2 sm:text-[13px]'

export type PostPublicationActionsProps = {
  postId: string
  whatsappNumber?: string | null | undefined
  className?: string
  /** En el detalle del post usar "#comments" */
  commentsHref?: string
  showComments?: boolean
  /** Texto del botón si no pasás `commentCount` */
  commentsLabel?: string
  /** Muestra "Comentar (n)" cuando hay comentarios habilitados */
  commentCount?: number
  /** Compartir enlace absoluto a `/post/{id}` (solo URL). Por defecto activo. */
  showShare?: boolean
  /** Fila de acciones más baja y junta (p. ej. detalle del post) */
  compact?: boolean
}

export function PostPublicationActions({
  postId,
  whatsappNumber,
  className,
  commentsHref: commentsHrefProp,
  showComments = true,
  commentsLabel = 'Comentar',
  commentCount,
  showShare = true,
  compact = false,
}: PostPublicationActionsProps) {
  const wa = whatsappNumber?.replace(/\D/g, '') ?? ''
  const hasWa = wa.length > 0
  const commentsHref = commentsHrefProp ?? `/post/${postId}`
  const isHashLink = commentsHref.startsWith('#')

  if (!showComments && !hasWa && !showShare) return null

  const handleShare = async () => {
    if (typeof window === 'undefined') return
    const url = postPermalink(postId)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ url })
        return
      } catch (e: unknown) {
        const name = e && typeof e === 'object' && 'name' in e ? String((e as { name: string }).name) : ''
        if (name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Enlace copiado al portapapeles')
    } catch {
      toast.error('No se pudo compartir ni copiar el enlace')
    }
  }

  const commentLine =
    typeof commentCount === 'number' ? `Comentar (${commentCount})` : commentsLabel

  const iconMsg = compact ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-[18px] w-[18px] sm:h-7 sm:w-7'
  const iconWa = compact ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-[18px] w-[18px] sm:h-7 sm:w-7'
  const iconShare = compact ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-[18px] w-[18px] sm:h-7 sm:w-7'

  const commentTrigger = (
    <>
      <MessageCircle className={cn('shrink-0', iconMsg)} strokeWidth={2.25} aria-hidden />
      <span className="max-w-[10rem] truncate text-center">{commentLine}</span>
    </>
  )

  const cBtn = compact ? commentBtnCompact : commentBtn
  const wBtn = compact ? waBtnCompact : waBtn
  const sBtn = compact ? shareBtnCompact : shareBtn

  return (
    <div
      role="group"
      aria-label="Acciones de la publicación"
      className={cn(touchRow, className)}
    >
      {showComments ? (
        <Button asChild variant="ghost" className={cBtn}>
          {isHashLink ? (
            <a href={commentsHref} className="inline-flex items-center justify-center gap-2 sm:gap-3">
              {commentTrigger}
            </a>
          ) : (
            <Link href={commentsHref} className="inline-flex items-center justify-center gap-2 sm:gap-3">
              {commentTrigger}
            </Link>
          )}
        </Button>
      ) : null}
      {hasWa ? (
        <Button asChild variant="ghost" className={wBtn}>
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 sm:gap-3"
          >
            <WhatsAppMark className={cn('shrink-0 text-[#25D366]', iconWa)} />
            <span className="text-center sm:hidden">WhatsApp</span>
            <span className="hidden text-center sm:inline">Contactar por WhatsApp</span>
          </a>
        </Button>
      ) : null}
      {showShare ? (
        <Button type="button" variant="ghost" className={sBtn} onClick={() => void handleShare()}>
          <span className="inline-flex items-center justify-center gap-2 sm:gap-3">
            <Share2 className={cn('shrink-0', iconShare)} strokeWidth={2.25} aria-hidden />
            <span className="max-w-[9rem] truncate text-center">Compartir</span>
          </span>
        </Button>
      ) : null}
    </div>
  )
}
