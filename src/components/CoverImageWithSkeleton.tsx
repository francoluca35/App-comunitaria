'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/app/components/ui/skeleton'
import { cn } from '@/app/components/ui/utils'

type Props = {
  src: string
  alt?: string
  className?: string
}

/** Imagen a ancho completo (p. ej. cover del feed) con placeholder hasta `onLoad`. */
export function CoverImageWithSkeleton({ src, alt = '', className }: Props) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
  }, [src])

  return (
    <div className={cn('relative h-full min-h-0 w-full overflow-hidden bg-[#D8D2CC]/30', className)}>
      {!loaded ? (
        <Skeleton className="absolute inset-0 z-0 rounded-none border-0 bg-[#D4CEC8]/65" aria-hidden />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn(
          'relative z-[1] h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}
