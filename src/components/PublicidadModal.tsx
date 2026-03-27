'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
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
import { Megaphone } from 'lucide-react'
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
        overlayClassName="backdrop-blur-md bg-black/60"
        className="sm:max-w-2xl w-[calc(100vw-1.5rem)] max-h-[min(100dvh-1rem,920px)] p-0 gap-0 overflow-hidden flex flex-col border-0 sm:rounded-2xl"
      >
        <DialogTitle className="sr-only">{publicidad.title}</DialogTitle>

        <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
          {imageUrls.length > 0 ? (
            <div className="relative shrink-0 bg-slate-100 dark:bg-gray-950 border-b border-slate-200 dark:border-gray-800">
              <Carousel
                key={publicidad.id}
                setApi={setCarouselApi}
                opts={{ loop: imageUrls.length > 1, align: 'start' }}
                className="w-full"
              >
                <CarouselContent className="-ml-0">
                  {imageUrls.map((url, i) => (
                    <CarouselItem key={`${publicidad.id}-img-${i}`} className="pl-0 basis-full">
                      <div className="flex items-center justify-center min-h-[200px] max-h-[min(55vh,520px)] p-2 sm:p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`${publicidad.title} — imagen ${i + 1}`}
                          className="max-h-[min(55vh,520px)] w-full object-contain"
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
                      className="left-2 sm:left-3 top-1/2 -translate-y-1/2 border-slate-200 dark:border-gray-700 shadow-md"
                    />
                    <CarouselNext
                      type="button"
                      variant="secondary"
                      className="right-2 sm:right-3 top-1/2 -translate-y-1/2 border-slate-200 dark:border-gray-700 shadow-md"
                    />
                  </>
                )}
              </Carousel>
              {imageUrls.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 text-white text-xs px-3 py-1 pointer-events-none">
                  {slideIndex + 1} / {imageUrls.length}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-slate-200 dark:bg-gray-800 flex items-center justify-center shrink-0">
              <Megaphone className="w-16 h-16 text-slate-400" />
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200/90 w-fit rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5">
              {categoryLabel}
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white leading-snug pr-8">
              {publicidad.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-gray-300 whitespace-pre-wrap">
              {publicidad.description}
            </p>
            <PublicidadContactLinks
              whatsappUrl={publicidad.whatsappUrl}
              instagramUrl={publicidad.instagramUrl}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
