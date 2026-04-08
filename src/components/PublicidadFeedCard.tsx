'use client'

import { useMemo, useState } from 'react'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import InstagramIcon from '@mui/icons-material/Instagram'
import { Globe, Instagram, Megaphone, MessageCircle, MoreHorizontal, Share2, X } from 'lucide-react'
import { toast } from 'sonner'
import { CoverImageWithSkeleton } from '@/components/CoverImageWithSkeleton'
import { getPublicidadImageUrls, type PublicidadDisplay } from '@/lib/publicidad-display'
import { CST } from '@/lib/cst-theme'
import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { cn } from '@/app/components/ui/utils'
import { publicidadPermalink } from '@/lib/app-public-url'

type Props = {
  publicidad: PublicidadDisplay
  categoryLabel: string
  onOpenDetail: () => void
  imagePriority?: boolean
}

/**
 * Tarjeta de publicidad en el feed, layout tipo publicación patrocinada (modo oscuro, imagen cuadrada, barra CTA).
 */
export function PublicidadFeedCard({
  publicidad: pub,
  categoryLabel,
  onOpenDetail,
  imagePriority = false,
}: Props) {
  const [captionExpanded, setCaptionExpanded] = useState(false)
  const pubImages = useMemo(() => getPublicidadImageUrls(pub), [pub])
  const mainImage = pubImages[0]
  const hasWa = Boolean(pub.whatsappUrl)
  const hasIg = Boolean(pub.instagramUrl)

  const hasLongCaption = pub.description.trim().length > 140

  const stop = (e: React.MouseEvent) => e.stopPropagation()

  const handleShare = async () => {
    if (typeof window === 'undefined') return
    const url = publicidadPermalink(pub.id)
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

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md bg-[#d6d6d6] text-[#000000] ring-1 ring-black/30',
        'sm:rounded-md',
      )}
    >
      {/* Cabecera: avatar, nombre, “Publicidad”, menú y cerrar */}
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#000000] ring-1 ring-white/10">
          {mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mainImage} alt="" className="h-full w-full object-cover" loading={imagePriority ? 'eager' : 'lazy'} />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-black"
              style={{ background: `linear-gradient(145deg, ${CST.bordo} 0%, ${CST.bordoDark} 100%)` }}
            >
              <Megaphone className="h-5 w-5 opacity-95" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-[15px] font-semibold leading-tight text-black">{pub.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0 text-xs text-[#151515]">
            <span>Publicidad</span>
            <span className="text-[#010101]/60">·</span>
            <Globe className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            <span className="truncate text-[#010101]/90">{categoryLabel}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-[#101010] hover:bg-white/10 hover:text-white"
                aria-label="Opciones de la publicidad"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onOpenDetail}>Ver detalle</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/cartelera">Todas las publicidades</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
       
        </div>
      </div>

      {/* Texto del anuncio */}
      {pub.description.trim() ? (
        <div className="px-3 pb-2">
          <p
            className={cn(
              'text-[15px] leading-snug text-[#131313]',
              !captionExpanded && hasLongCaption && 'line-clamp-4',
            )}
          >
            {pub.description.trim()}
            {hasLongCaption && !captionExpanded ? (
              <>
                {' '}
                <button
                  type="button"
                  className="inline font-semibold text-white hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCaptionExpanded(true)
                  }}
                >
                  Ver más
                </button>
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {/* Imagen principal 1:1 */}
      <button
        type="button"
        onClick={onOpenDetail}
        className="relative block w-full cursor-pointer border-0 bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4599FF]"
      >
        <div className="aspect-square w-full">
          {mainImage ? (
            <CoverImageWithSkeleton
              src={mainImage}
              alt={pub.title}
              className="h-full min-h-0"
              loading={imagePriority ? 'eager' : 'lazy'}
            />
          ) : (
            <div className="flex h-full w-full min-h-[12rem] items-center justify-center bg-[#3A3B3C]">
              <Megaphone className="h-14 w-14 text-[#B0B3B8]/40" aria-hidden />
            </div>
          )}
        </div>
      </button>

      {/* Barra CTA: frase fija + íconos WhatsApp / Instagram */}
      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[#3A3B3C] px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[11px] font-medium leading-tight text-[#B0B3B8]">{pub.title}</p>
          <p className="mt-1 text-[15px] font-semibold leading-snug text-white">Contactate</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasWa ? (
            <a
              href={pub.whatsappUrl!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#25D366] text-white shadow-sm transition-colors hover:bg-[#20BD5A]"
              aria-label="Contactar por WhatsApp"
            >
              <WhatsAppIcon sx={{ fontSize: 26 }} />
            </a>
          ) : null}
          {hasIg ? (
            <a
              href={pub.instagramUrl!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-[#f09433] via-[#e1306c] to-[#833ab4] text-white shadow-sm transition-opacity hover:opacity-95"
              aria-label="Ver en Instagram"
            >
              <InstagramIcon sx={{ fontSize: 24 }} />
            </a>
          ) : null}
          {!hasWa && !hasIg ? (
            <button
              type="button"
              onClick={(e) => {
                stop(e)
                onOpenDetail()
              }}
              className="inline-flex shrink-0 items-center rounded-md bg-[#4E4F50] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#5F6C7B]"
            >
              Ver más
            </button>
          ) : null}
        </div>
      </div>

      {/* Barra de interacción estilo red social */}
      <div className="flex items-center justify-between border-t border-[#3E4042] bg-[#d6d6d6] px-2 py-2 text-[#000000]">
        <div className="flex min-w-0 flex-1 items-center gap-0.5 sm:gap-3">
          {pub.whatsappUrl ? (
            <a
              href={pub.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium hover:bg-white/5"
            >
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden />
              Comentar
            </a>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                stop(e)
                onOpenDetail()
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium hover:bg-white/5"
            >
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden />
              Comentar
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              stop(e)
              void handleShare()
            }}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium hover:bg-white/5"
          >
            <Share2 className="h-[18px] w-[18px]" aria-hidden />
            Compartir
          </button>
        </div>
    
      </div>
    </div>
  )
}
