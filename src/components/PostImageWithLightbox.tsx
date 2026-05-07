'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ImageOff, Video } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/app/components/ui/utils'
import { Skeleton } from '@/app/components/ui/skeleton'
import type { PostMediaItem } from '@/app/providers'

type Variant = 'feed' | 'detail'

type PostImageWithLightboxProps = {
  media: PostMediaItem[]
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

type CollageCellProps = {
  item: PostMediaItem
  index: number
  alt: string
  priority: boolean
  failed: boolean
  onFail: () => void
  onOpen: (index: number) => void
  className?: string
  overlayCount?: number
}

function CollageCell({
  item,
  index,
  alt,
  priority,
  failed,
  onFail,
  onOpen,
  className,
  overlayCount,
}: CollageCellProps) {
  const [loaded, setLoaded] = useState(false)
  const isVideo = item.type === 'video'

  useEffect(() => {
    setLoaded(false)
  }, [item.url, isVideo])

  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className={cn(
        'group relative block min-h-0 min-w-0 overflow-hidden bg-[#D4CEC8] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8B0015]/55',
        className
      )}
      aria-label={
        isVideo
          ? `Ver video ${index + 1}: ${alt}`
          : `Ver foto ${index + 1}: ${alt}`
      }
    >
      {failed ? (
        <div className="flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-1 p-2 text-[#7A5C52]">
          <ImageOff className="h-8 w-8 opacity-70" aria-hidden />
          <span className="text-xs font-medium">Error</span>
        </div>
      ) : (
        <>
          {!loaded ? (
            <Skeleton
              className="pointer-events-none absolute inset-0 z-0 rounded-none border-0 bg-[#D4CEC8]/90"
              aria-hidden
            />
          ) : null}
          {isVideo ? (
            <span className="pointer-events-none absolute left-1.5 top-1.5 z-[2] flex items-center gap-1 rounded-md bg-[#2B2B2B]/85 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:text-xs">
              <Video className="h-3 w-3 shrink-0" aria-hidden />
              Video
            </span>
          ) : null}
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-[2] rounded-md bg-[#2B2B2B]/75 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:text-xs">
            Ampliar
          </span>
          {overlayCount != null && overlayCount > 0 ? (
            <div
              className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center bg-black/55 text-2xl font-bold text-white sm:text-3xl"
              aria-hidden
            >
              +{overlayCount}
            </div>
          ) : null}
          {isVideo ? (
            <video
              key={item.url}
              src={item.url}
              muted
              playsInline
              preload="metadata"
              className={cn(
                'relative z-[1] h-full w-full object-cover transition-opacity duration-300',
                loaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoadedData={() => setLoaded(true)}
              onError={onFail}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt=""
              width={800}
              height={600}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              draggable={false}
              onLoad={() => setLoaded(true)}
              onError={onFail}
              className={cn(
                'relative z-[1] h-full w-full object-cover transition-opacity duration-300',
                loaded ? 'opacity-100' : 'opacity-0'
              )}
            />
          )}
        </>
      )}
    </button>
  )
}

export function PostImageWithLightbox({
  media,
  alt,
  variant = 'feed',
  priority = false,
  className,
}: PostImageWithLightboxProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [failed, setFailed] = useState<Record<number, boolean>>({})
  const [lightboxLoaded, setLightboxLoaded] = useState(false)
  const lightboxVideoRef = useRef<HTMLVideoElement | null>(null)

  const n = media.length
  const lbIdx = normIndex(lightboxIndex, n)
  const lbItem = n > 0 ? media[lbIdx] : null
  const lbSrc = lbItem?.url ?? ''
  const lbIsVideo = lbItem?.type === 'video'

  const goLightbox = useCallback(
    (delta: number) => {
      if (n <= 1) return
      setLightboxIndex((i) => normIndex(i + delta, n))
    },
    [n]
  )

  useEffect(() => {
    setLightboxLoaded(false)
  }, [lbSrc, lbIsVideo])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goLightbox(-1)
      if (e.key === 'ArrowRight') goLightbox(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, goLightbox])

  useEffect(() => {
    if (!lightboxOpen || !lbIsVideo || !lightboxLoaded) return
    const v = lightboxVideoRef.current
    if (!v) return
    v.muted = false
    const run = () => {
      v.play().catch(() => {
        v.muted = true
        void v.play().catch(() => {})
      })
    }
    requestAnimationFrame(run)
    return () => {
      v.pause()
    }
  }, [lightboxOpen, lbIsVideo, lightboxLoaded, lbSrc, lbIdx])

  useEffect(() => {
    if (!lightboxOpen) lightboxVideoRef.current?.pause()
  }, [lightboxOpen])

  const openLightbox = (startIndex: number) => {
    setLightboxIndex(normIndex(startIndex, n))
    setLightboxOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setLightboxOpen(open)
  }

  const maxH =
    variant === 'detail' ? 'min(42vh, 360px)' : 'min(75vh, 560px)'

  if (n === 0) return null

  const setFailedAt = (i: number) => setFailed((s) => ({ ...s, [i]: true }))

  return (
    <>
      <div
        className={cn(
          'relative w-full bg-[#E8E4E0]',
          variant === 'feed' && 'flex flex-col rounded-none leading-none',
          variant === 'detail' && 'overflow-hidden rounded-none border border-[#D8D2CC]',
          className
        )}
      >
        {n === 1 ? (
          <SingleMediaPreview
            item={media[0]}
            alt={alt}
            variant={variant}
            priority={priority}
            maxH={maxH}
            failed={!!failed[0]}
            onFail={() => setFailedAt(0)}
            onOpen={() => openLightbox(0)}
          />
        ) : (
          <MultiMediaCollage
            media={media}
            alt={alt}
            priority={priority}
            failed={failed}
            onFail={setFailedAt}
            onOpen={openLightbox}
            variant={variant}
          />
        )}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          variant="fullscreen"
          overlayClassName="bg-black/90 backdrop-blur-[1px]"
          className="data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 duration-150"
          showCloseButton={false}
          onClick={() => handleDialogOpenChange(false)}
        >
          <DialogTitle className="sr-only">
            {alt} — {lbIsVideo ? 'video' : 'imagen'} ampliada {n > 1 ? `(${lbIdx + 1} de ${n})` : ''}
          </DialogTitle>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-[60] h-12 w-12 rounded-full border border-white/30 bg-black/50 text-white hover:bg-black/70 sm:right-4 sm:top-4"
            onClick={(e) => {
              e.stopPropagation()
              handleDialogOpenChange(false)
            }}
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
                onClick={(e) => {
                  e.stopPropagation()
                  goLightbox(-1)
                }}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-7 w-7" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 z-[60] h-12 w-12 -translate-y-1/2 rounded-full border border-white/25 bg-black/45 text-white hover:bg-black/65 sm:right-3"
                onClick={(e) => {
                  e.stopPropagation()
                  goLightbox(1)
                }}
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
                  <Skeleton
                    className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(50vh,420px)] w-[min(92vw,680px)] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-white/15"
                    aria-hidden
                  />
                ) : null}
                {lbIsVideo ? (
                  <video
                    ref={lightboxVideoRef}
                    key={lbSrc}
                    src={lbSrc}
                    controls
                    playsInline
                    autoPlay
                    className={cn(
                      'relative z-[1] mx-auto h-auto max-h-[calc(100dvh-5.5rem)] w-auto max-w-[min(100vw-1.5rem,calc(100dvh-5.5rem))] object-contain transition-opacity duration-200',
                      lightboxLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                    onLoadedData={() => setLightboxLoaded(true)}
                    onError={() => setFailed((s) => ({ ...s, [lbIdx]: true }))}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
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
                      lightboxLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                    onError={() => setFailed((s) => ({ ...s, [lbIdx]: true }))}
                  />
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/90">
                <ImageOff className="h-16 w-16" />
                <span>No se pudo cargar el archivo</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SingleMediaPreview({
  item,
  alt,
  variant,
  priority,
  maxH,
  failed,
  onFail,
  onOpen,
}: {
  item: PostMediaItem
  alt: string
  variant: Variant
  priority: boolean
  maxH: string
  failed: boolean
  onFail: () => void
  onOpen: () => void
}) {
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const previewSrc = item.url
  const previewIsVideo = item.type === 'video'

  useEffect(() => {
    setPreviewLoaded(false)
  }, [previewSrc, previewIsVideo])

  if (failed) {
    return (
      <div
        className="flex min-h-[200px] flex-col items-center justify-center gap-2 py-10 text-[#7A5C52]"
        role="img"
        aria-label="Medio no disponible"
      >
        <ImageOff className="h-12 w-12 opacity-70" aria-hidden />
        <span className="text-sm font-medium">No se pudo cargar el archivo</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative block w-full cursor-zoom-in px-0 py-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B0015]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#E8E4E0]'
      )}
      aria-label={previewIsVideo ? `Ver video: ${alt}` : `Ver imagen: ${alt}`}
    >
      {!previewLoaded ? (
        <Skeleton
          className={cn(
            'pointer-events-none absolute inset-0 z-0 rounded-none ',
            variant === 'feed' ? 'border-0' : 'border '
          )}
          aria-hidden
        />
      ) : null}
      {previewIsVideo ? (
        <span className="pointer-events-none absolute left-2 top-2 z-[2] flex items-center gap-1 rounded-lg bg-[#2B2B2B]/80 px-2 py-1 text-xs font-medium text-white">
          <Video className="h-3.5 w-3.5" aria-hidden />
          Video
        </span>
      ) : null}
      <span className="pointer-events-none absolute bottom-2 right-2 z-[2] rounded-lg bg-[#2B2B2B]/75 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:text-sm">
        Tocar para ampliar
      </span>
      {previewIsVideo ? (
        <video
          key={previewSrc}
          src={previewSrc}
          muted
          playsInline
          controls
          preload="metadata"
          className={cn(
            'relative z-[1] block h-auto w-full max-w-full select-none transition-opacity duration-300',
            previewLoaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{ maxHeight: maxH }}
          onLoadedData={() => setPreviewLoaded(true)}
          onError={onFail}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
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
          onError={onFail}
          className={cn(
            'relative z-[1] block h-auto w-full max-w-full select-none transition-opacity duration-300',
            previewLoaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{ maxHeight: maxH }}
        />
      )}
    </button>
  )
}

function MultiMediaCollage({
  media,
  alt,
  priority,
  failed,
  onFail,
  onOpen,
  variant,
}: {
  media: PostMediaItem[]
  alt: string
  priority: boolean
  failed: Record<number, boolean>
  onFail: (i: number) => void
  onOpen: (i: number) => void
  variant: Variant
}) {
  const n = media.length
  /** Altura cómoda en feed / detalle (tipo muro) */
  const collageHeight =
    variant === 'detail'
      ? 'clamp(160px, 36vh, 320px)'
      : 'clamp(240px, 52vw, 480px)'

  const collageShell =
    variant === 'feed'
      ? 'grid bg-[#CED0D4] p-0 gap-px'
      : 'grid bg-[#D8D2CC] p-0.5 gap-0.5'

  /** Filas tipo Facebook: arriba ~62%, abajo ~38% (2+3 cuando hay ≥5) */
  const rowsTopHeavy = 'grid-rows-[minmax(0,62fr)_minmax(0,38fr)]'

  if (n === 2) {
    return (
      <div
        className={cn(collageShell, 'grid-cols-2 grid-rows-1')}
        style={{ height: collageHeight }}
      >
        {media.map((item, index) => (
          <CollageCell
            key={`${item.url}-${index}`}
            item={item}
            index={index}
            alt={alt}
            priority={priority && index === 0}
            failed={!!failed[index]}
            onFail={() => onFail(index)}
            onOpen={onOpen}
            className="h-full min-h-0"
          />
        ))}
      </div>
    )
  }

  if (n === 3) {
    return (
      <div
        className={cn(collageShell, 'grid-cols-2', rowsTopHeavy)}
        style={{ height: collageHeight }}
      >
        <CollageCell
          item={media[0]}
          index={0}
          alt={alt}
          priority={priority}
          failed={!!failed[0]}
          onFail={() => onFail(0)}
          onOpen={onOpen}
          className="col-span-1 min-h-0 h-full"
        />
        <CollageCell
          item={media[1]}
          index={1}
          alt={alt}
          priority={false}
          failed={!!failed[1]}
          onFail={() => onFail(1)}
          onOpen={onOpen}
          className="col-span-1 min-h-0 h-full"
        />
        <CollageCell
          item={media[2]}
          index={2}
          alt={alt}
          priority={false}
          failed={!!failed[2]}
          onFail={() => onFail(2)}
          onOpen={onOpen}
          className="col-span-2 min-h-0 h-full"
        />
      </div>
    )
  }

  if (n === 4) {
    return (
      <div
        className={cn(collageShell, 'grid-cols-2 grid-rows-2')}
        style={{ height: collageHeight }}
      >
        {media.slice(0, 4).map((item, index) => (
          <CollageCell
            key={`${item.url}-${index}`}
            item={item}
            index={index}
            alt={alt}
            priority={priority && index === 0}
            failed={!!failed[index]}
            onFail={() => onFail(index)}
            onOpen={onOpen}
            className="min-h-0 h-full"
          />
        ))}
      </div>
    )
  }

  const moreCount = n > 5 ? n - 5 : undefined

  return (
    <div
      className={cn(collageShell, 'grid-cols-6', rowsTopHeavy)}
      style={{ height: collageHeight }}
    >
      <CollageCell
        item={media[0]}
        index={0}
        alt={alt}
        priority={priority}
        failed={!!failed[0]}
        onFail={() => onFail(0)}
        onOpen={onOpen}
        className="col-span-3 min-h-0 h-full"
      />
      <CollageCell
        item={media[1]}
        index={1}
        alt={alt}
        priority={false}
        failed={!!failed[1]}
        onFail={() => onFail(1)}
        onOpen={onOpen}
        className="col-span-3 min-h-0 h-full"
      />
      <CollageCell
        item={media[2]}
        index={2}
        alt={alt}
        priority={false}
        failed={!!failed[2]}
        onFail={() => onFail(2)}
        onOpen={onOpen}
        className="col-span-2 min-h-0 h-full"
      />
      <CollageCell
        item={media[3]}
        index={3}
        alt={alt}
        priority={false}
        failed={!!failed[3]}
        onFail={() => onFail(3)}
        onOpen={onOpen}
        className="col-span-2 min-h-0 h-full"
      />
      <CollageCell
        item={media[4]}
        index={4}
        alt={alt}
        priority={false}
        failed={!!failed[4]}
        onFail={() => onFail(4)}
        onOpen={onOpen}
        className="col-span-2 min-h-0 h-full"
        overlayCount={moreCount}
      />
    </div>
  )
}
