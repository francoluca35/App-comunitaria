'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/app/components/ui/carousel'
import { Megaphone, X } from 'lucide-react'
import { getPublicidadImageUrls, type PublicidadDisplay } from '@/lib/publicidad-display'
import { PublicidadContactLinks } from '@/components/PublicidadContactLinks'
import { useApp } from '@/app/providers'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  publicidad: PublicidadDisplay | null
}

export function PublicidadModal({ open, onOpenChange, publicidad }: Props) {
  const { publicidadCategories } = useApp()
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [slideIndex, setSlideIndex] = useState(0)

  const imageUrls = useMemo(() => (publicidad ? getPublicidadImageUrls(publicidad) : []), [publicidad])

  useEffect(() => {
    if (!carouselApi) return
    setSlideIndex(carouselApi.selectedScrollSnap())
    const onSelect = () => setSlideIndex(carouselApi.selectedScrollSnap())
    carouselApi.on('select', onSelect)
    return () => {
      carouselApi.off('select', onSelect)
    }
  }, [carouselApi])

  useEffect(() => {
    if (open && carouselApi) {
      carouselApi.scrollTo(0)
      setSlideIndex(0)
    }
  }, [open, publicidad?.id, carouselApi])

  if (!publicidad) return null

  const categoryLabel =
    publicidadCategories.find((c) => c.slug === publicidad.category)?.label ?? publicidad.category

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="backdrop-blur-[3px] bg-slate-950/55"
        className="flex w-[calc(100vw-1.25rem)] max-w-xl flex-col gap-0 overflow-hidden border border-slate-200/80 bg-white p-0 shadow-2xl dark:border-gray-700/80 dark:bg-gray-950 sm:rounded-[1.35rem]"
      >
        <DialogTitle className="sr-only">{publicidad.title}</DialogTitle>

        <div className="flex min-h-0 max-h-[min(100dvh-1rem,880px)] flex-1 flex-col overflow-hidden">
          {/* Hero imagen */}
          <div className="relative shrink-0 overflow-hidden rounded-t-[1.35rem] bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
            <DialogClose
              type="button"
              className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-lg ring-1 ring-black/[0.04] backdrop-blur-sm transition hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:border-gray-600 dark:bg-gray-900/95 dark:text-gray-100 dark:ring-white/10 dark:hover:bg-gray-800"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" strokeWidth={2.25} />
            </DialogClose>

            {imageUrls.length > 0 ? (
              <Carousel
                key={publicidad.id}
                setApi={setCarouselApi}
                opts={{ loop: imageUrls.length > 1, align: 'start' }}
                className="w-full"
              >
                <CarouselContent className="-ml-0">
                  {imageUrls.map((url, i) => (
                    <CarouselItem key={`${publicidad.id}-img-${i}`} className="basis-full pl-0">
                      <div className="flex min-h-[220px] max-h-[min(48vh,440px)] items-center justify-center px-0 py-0 sm:max-h-[min(50vh,480px)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`${publicidad.title} — imagen ${i + 1}`}
                          className="h-full max-h-[min(48vh,440px)] w-full object-contain sm:max-h-[min(50vh,480px)]"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {imageUrls.length > 1 && (
                  <>
                    <CarouselPrevious
                      type="button"
                      variant="secondary"
                      className="left-2 top-1/2 h-9 w-9 -translate-y-1/2 border-0 bg-white/90 text-slate-800 shadow-md backdrop-blur-sm hover:bg-white dark:bg-gray-900/90 dark:text-gray-100 dark:hover:bg-gray-800"
                    />
                    <CarouselNext
                      type="button"
                      variant="secondary"
                      className="right-2 top-1/2 h-9 w-9 -translate-y-1/2 border-0 bg-white/90 text-slate-800 shadow-md backdrop-blur-sm hover:bg-white dark:bg-gray-900/90 dark:text-gray-100 dark:hover:bg-gray-800"
                    />
                  </>
                )}
              </Carousel>
            ) : (
              <div className="flex aspect-[16/10] min-h-[180px] items-center justify-center">
                <Megaphone className="h-14 w-14 text-slate-300 dark:text-gray-600" aria-hidden />
              </div>
            )}

            {imageUrls.length > 1 ? (
              <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-slate-900/75 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm dark:bg-black/65">
                {slideIndex + 1} / {imageUrls.length}
              </div>
            ) : null}

            {/* Degradado suave hacia el contenido */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent dark:from-gray-950 dark:to-transparent"
              aria-hidden
            />
          </div>

          {/* Texto y acciones */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-b-[1.35rem] bg-white px-5 pb-6 pt-1 dark:bg-gray-950 sm:px-6">
            <div className="mb-3 inline-flex w-fit items-center rounded-full border border-amber-200/80 bg-amber-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-900/90 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200/95">
              {categoryLabel}
            </div>
            <h3 className="text-xl font-semibold leading-snug tracking-tight text-slate-900 dark:text-white">
              {publicidad.title}
            </h3>
            {publicidad.description?.trim() ? (
              <p className="mt-2.5 text-[15px] leading-relaxed text-slate-600 dark:text-gray-300">
                {publicidad.description.trim()}
              </p>
            ) : null}

            {publicidad.whatsappUrl || publicidad.instagramUrl ? (
              <div className="mt-2 border-t border-slate-100 pt-5 dark:border-gray-800/80">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-gray-500">
                  Contacto
                </p>
                <PublicidadContactLinks
                  whatsappUrl={publicidad.whatsappUrl}
                  instagramUrl={publicidad.instagramUrl}
                  size="modal"
                />
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
