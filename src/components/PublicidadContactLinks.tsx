'use client'

import { MessageCircle, Instagram } from 'lucide-react'

type Size = 'default' | 'compact' | 'sidebar' | 'modal'

const sizeClass: Record<Size, { wrap: string; btn: string; icon: string }> = {
  default: {
    wrap: 'mt-4 flex flex-col gap-2',
    btn: 'flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-white text-sm transition-opacity hover:opacity-95',
    icon: 'w-5 h-5',
  },
  /** Modal de detalle: fila en pantallas anchas, estilo más sobrio */
  modal: {
    wrap: 'mt-6 flex flex-col gap-2.5 sm:flex-row sm:gap-3',
    btn: 'flex flex-1 items-center justify-center gap-2 min-h-[2.75rem] rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.99]',
    icon: 'w-[1.125rem] h-[1.125rem]',
  },
  compact: {
    wrap: 'mt-1.5 flex flex-col gap-1.5',
    btn: 'flex items-center justify-center gap-1 w-full py-2 rounded-lg text-[10px] font-medium text-white transition-opacity hover:opacity-95',
    icon: 'w-3 h-3',
  },
  sidebar: {
    wrap: 'mt-2 flex flex-col gap-1.5',
    btn: 'flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-95',
    icon: 'w-3.5 h-3.5',
  },
}

type Props = {
  whatsappUrl?: string
  instagramUrl?: string
  size?: Size
  /** Ej.: evitar que el click cierre un card que es <button> */
  stopPropagationOnClick?: boolean
  /** Anillo pulsante en los botones (p. ej. feed principal) */
  pulse?: boolean
}

export function PublicidadContactLinks({
  whatsappUrl,
  instagramUrl,
  size = 'default',
  stopPropagationOnClick,
  pulse = false,
}: Props) {
  if (!whatsappUrl && !instagramUrl) return null

  const s = sizeClass[size]

  const onClick = stopPropagationOnClick
    ? (e: React.MouseEvent) => {
        e.stopPropagation()
      }
    : undefined

  const waClass =
    size === 'modal'
      ? `${s.btn} bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md`
      : `${s.btn} bg-[#25D366] hover:bg-[#20BD5A] ${pulse ? 'publicidad-cta-pulse-wa' : ''}`

  const igClass =
    size === 'modal'
      ? `${s.btn} border border-slate-200/90 bg-white text-slate-800 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-100 dark:hover:bg-gray-800`
      : `${s.btn} bg-gradient-to-r from-[#f09433] via-[#e1306c] to-[#833ab4] text-white [&_svg]:text-white ${pulse ? 'publicidad-cta-pulse-ig' : ''}`

  return (
    <div className={s.wrap}>
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          className={waClass}
        >
          <MessageCircle className={s.icon} aria-hidden />
          WhatsApp
        </a>
      )}
      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          className={igClass}
        >
          <Instagram
            className={`${s.icon} ${size === 'modal' ? 'text-pink-600 dark:text-pink-400' : ''}`}
            aria-hidden
          />
          Instagram
        </a>
      )}
    </div>
  )
}
