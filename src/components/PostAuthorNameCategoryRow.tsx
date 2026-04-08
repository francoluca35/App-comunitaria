'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { CategoryBadge } from '@/components/CategoryBadge'
import { cn } from '@/app/components/ui/utils'

const MAX_FONT_PX = 15
const MIN_FONT_PX = 11
const STEP = 0.5

type Props = {
  authorName: string
  category: string
  /** Pendiente / Rechazada; va al final de la fila sin robar espacio al nombre hasta donde se pueda */
  statusBadge?: React.ReactNode
  /** Tamaño base del nombre (feed vs tarjeta) */
  nameClassName?: string
}

/**
 * Nombre y categoría en una sola línea. El nombre tiene prioridad: reduce tamaño de fuente
 * solo si no entra; la categoría no se encoge.
 */
export function PostAuthorNameCategoryRow({
  authorName,
  category,
  statusBadge,
  nameClassName,
}: Props) {
  const rowRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)
  const [fontPx, setFontPx] = useState(MAX_FONT_PX)

  useLayoutEffect(() => {
    const row = rowRef.current
    const nameEl = nameRef.current
    if (!row || !nameEl) return

    const run = () => {
      const badgeWrap = row.querySelector('[data-post-category-badge]') as HTMLElement | null
      const badgeW = badgeWrap?.offsetWidth ?? 0
      const gap = 6
      const rowW = row.offsetWidth
      const available = Math.max(0, rowW - badgeW - gap)

      nameEl.style.maxWidth = ''
      nameEl.classList.remove('truncate')

      let fs = MAX_FONT_PX
      for (; fs >= MIN_FONT_PX; fs -= STEP) {
        nameEl.style.fontSize = `${fs}px`
        if (nameEl.scrollWidth <= available) break
      }
      setFontPx(fs)

      if (fs <= MIN_FONT_PX && nameEl.scrollWidth > available) {
        nameEl.style.maxWidth = `${available}px`
        nameEl.classList.add('truncate')
      }
    }

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(run)
    })
    ro.observe(row)
    requestAnimationFrame(run)
    return () => ro.disconnect()
  }, [authorName, category, statusBadge])

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div ref={rowRef} className="flex min-w-0 flex-1 items-center gap-1.5">
        <span
          ref={nameRef}
          className={cn('min-w-0 whitespace-nowrap font-medium text-[#2B2B2B]', nameClassName)}
          style={{ fontSize: fontPx }}
        >
          {authorName}
        </span>
        <span data-post-category-badge className="shrink-0">
          <CategoryBadge category={category} compact />
        </span>
      </div>
      {statusBadge ? <div className="shrink-0">{statusBadge}</div> : null}
    </div>
  )
}
