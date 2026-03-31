'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/app/components/ui/utils'
import { Skeleton } from '@/app/components/ui/skeleton'

type Variant = 'feed' | 'detail'

type PostImageWithLightboxProps = {
  images: string[]
  alt: string
  variant?: Variant
  /** Primeras filas del feed: carga prioritaria (LCP) */
  priority?: boolean
  className?: string
}

function normIndex(i: number, n: number) {
  if (n <= 0) return 0
  return ((i % n) + n) % n
}

export function PostImageWithLightbox({
  images,
  alt,
  variant = 'feed',
  priority = false,
  className,
}: PostImageWithLightboxProps) {
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [failed, setFailed] = useState<Record<number, boolean>>({})
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [lightboxLoaded, setLightboxLoaded] = useState(false)

  const n = images.length
  const previewIndex = variant === 'feed' ? 0 : normIndex(carouselIndex, n)
  const previewSrc = n > 0 ? images[previewIndex] : ''
  const lbIdx = normIndex(lightboxIndex, n)
  const lbSrc = n > 0 ? images[lbIdx] : ''

  const goCarousel = useCallback(
    (delta: number) => {
      if (n <= 1) return
      setCarouselIndex((i) => normIndex(i + delta, n))
    },
    [n],
  )

  const goLightbox = useCallback(
    (delta: number) => {
      if (n <= 1) return
      setLightboxIndex((i) => normIndex(i + delta, n))
    },
    [n],
  )

  useEffect(() => {
    setPreviewLoaded(false)
  }, [previewSrc])

  useEffect(() => {
    setLightboxLoaded(false)
  }, [lbSrc])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goLightbox(-1)
      if (e.key === 'ArrowRight') goLightbox(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, goLightbox])

  const openLightbox = () => {
    const start = variant === 'feed' ? 0 : normIndex(carouselIndex, n)
    setLightboxIndex(start)
    setLightboxOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && variant === 'detail' && n > 0) {
      setCarouselIndex(normIndex(lightboxIndex, n))
    }
    setLightboxOpen(open)
  }

  const maxH =
    variant === 'detail'
      ? 'min(88vh, 720px)'
      : 'min(75vh, 560px)'

  if (n === 0) return null

  const failedPreview = failed[previewIndex]

  return (
    <>
      <div
        className={cn(
          'relative w-full bg-[#E8E4E0]',
          variant === 'detail' && 'overflow-hidden rounded-2xl ring-1 ring-[#D8D2CC]',
          className,
        )}
      >
        {failedPreview ? (
          <div
            className="flex min-h-[200px] flex-col items-center justify-center gap-2 py-10 text-[#7A5C52]"
            role="img"
            aria-label="Imagen no disponible"
          >
            <ImageOff className="h-12 w-12 opacity-70" aria-hidden />
            <span className="text-sm font-medium">Imagen no disponible</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={openLightbox}
              className={cn(
                'group relative grid w-full cursor-zoom-in place-items-center px-2 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B0015]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#E8E4E0]',
                variant === 'detail' && 'rounded-2xl',
              )}
              style={{ minHeight: maxH }}
              aria-label={`Ver imagen completa: ${alt}`}
            >
              {!previewLoaded ? (
                <Skeleton
                  className="pointer-events-none absolute inset-x-2 top-3 bottom-3 z-0 rounded-xl border border-[#D8D2CC]/40 bg-[#D4CEC8]/65"
                  aria-hidden
                />
              ) : null}
              <span className="pointer-events-none absolute bottom-2 right-2 z-[2] rounded-lg bg-[#2B2B2B]/75 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:text-sm">
                Tocar para ampliar
              </span>
              <img
                src={previewSrc}
                alt={alt}
                width={1600}
                height={1200}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : 'auto'}
                decoding="async"
                draggable={false}
                onLoad={() => setPreviewLoaded(true)}
                onError={() => setFailed((s) => ({ ...s, [previewIndex]: true }))}
                className={cn(
                  'relative z-[1] h-auto w-auto max-w-full object-contain object-center select-none transition-opacity duration-300',
                  previewLoaded ? 'opacity-100' : 'opacity-0',
                )}
                style={{ maxHeight: maxH }}
              />
            </button>

            {variant === 'detail' && n > 1 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full border-0 bg-[#2B2B2B]/55 text-white shadow-md hover:bg-[#2B2B2B]/75"
                  onClick={(e) => {
                    e.stopPropagation()
                    goCarousel(-1)
                  }}
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full border-0 bg-[#2B2B2B]/55 text-white shadow-md hover:bg-[#2B2B2B]/75"
                  onClick={(e) => {
                    e.stopPropagation()
                    goCarousel(1)
                  }}
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
                <div
                  className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-[#2B2B2B]/45 px-2 py-1"
                  aria-hidden
                >
                  {images.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        i === previewIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/55',
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {variant === 'feed' && n > 1 ? (
        <p className="border-t border-[#D8D2CC]/60 bg-[#E8E4E0] px-3 py-2.5 text-center text-sm font-medium text-[#2B2B2B]">
          {n} fotos — tocá la imagen para verlas todas en grande
        </p>
      ) : null}

      <Dialog open={lightboxOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          variant="fullscreen"
          overlayClassName="bg-black/90 backdrop-blur-[1px]"
          className="data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 duration-150"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            {alt} — imagen ampliada {n > 1 ? `(${lbIdx + 1} de ${n})` : ''}
          </DialogTitle>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-[60] h-12 w-12 rounded-full border border-white/30 bg-black/50 text-white hover:bg-black/70 sm:right-4 sm:top-4"
            onClick={() => handleDialogOpenChange(false)}
            aria-label="Cerrar"
          >
            <span className="text-2xl leading-none" aria-hidden>
              ×
            </span>
          </Button>

          {n > 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-1 top-1/2 z-[60] h-12 w-12 -translate-y-1/2 rounded-full border border-white/25 bg-black/45 text-white hover:bg-black/65 sm:left-3"
                onClick={() => goLightbox(-1)}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-7 w-7" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 z-[60] h-12 w-12 -translate-y-1/2 rounded-full border border-white/25 bg-black/45 text-white hover:bg-black/65 sm:right-3"
                onClick={() => goLightbox(1)}
                aria-label="Siguiente"
              >
                <ChevronRight className="h-7 w-7" />
              </Button>
              <p className="absolute bottom-3 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-sm font-medium text-white">
                {lbIdx + 1} / {n}
              </p>
            </>
          )}

          <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-auto px-3 pb-8 pt-14 sm:px-6 sm:pb-10 sm:pt-16">
            {!failed[lbIdx] ? (
              <>
                {!lightboxLoaded ? (
                  <Skeleton className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(50vh,420px)] w-[min(92vw,680px)] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-white/15" aria-hidden />
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lbSrc}
                  alt={alt}
                  width={2400}
                  height={1800}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  draggable={false}
                  onLoad={() => setLightboxLoaded(true)}
                  className={cn(
                    'relative z-[1] mx-auto h-auto max-h-[calc(100dvh-5.5rem)] w-auto max-w-[min(100vw-1.5rem,calc(100dvh-5.5rem))] object-contain object-center transition-opacity duration-200',
                    lightboxLoaded ? 'opacity-100' : 'opacity-0',
                  )}
                  onError={() => setFailed((s) => ({ ...s, [lbIdx]: true }))}
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/90">
                <ImageOff className="h-16 w-16" />
                <span>No se pudo cargar la imagen</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
