'use client'

import { MessageCircle, Instagram } from 'lucide-react'

type Size = 'default' | 'compact' | 'sidebar'

const sizeClass: Record<Size, { wrap: string; btn: string; icon: string }> = {
  default: {
    wrap: 'mt-4 flex flex-col gap-2',
    btn: 'flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-white text-sm transition-opacity hover:opacity-95',
    icon: 'w-5 h-5',
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

  return (
    <div className={s.wrap}>
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          className={`${s.btn} bg-[#25D366] hover:bg-[#20BD5A] ${pulse ? 'publicidad-cta-pulse-wa' : ''}`}
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
          className={`${s.btn} bg-gradient-to-r from-[#f09433] via-[#e1306c] to-[#833ab4] ${pulse ? 'publicidad-cta-pulse-ig' : ''}`}
        >
          <Instagram className={s.icon} aria-hidden />
          Instagram
        </a>
      )}
    </div>
  )
}
