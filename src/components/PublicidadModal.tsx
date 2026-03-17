'use client'

import {
  Dialog,
  DialogContent,
} from '@/app/components/ui/dialog'
import { MessageCircle, Instagram, Megaphone } from 'lucide-react'
import type { DemoPublicidad } from '@/lib/demo-publicidades'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  publicidad: DemoPublicidad | null
}

export function PublicidadModal({ open, onOpenChange, publicidad }: Props) {
  if (!publicidad) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="backdrop-blur-md bg-black/60"
        className="sm:max-w-md p-0 overflow-hidden"
      >
        <div className="rounded-xl overflow-hidden">
          <div className="aspect-video bg-slate-200 dark:bg-gray-700">
            {publicidad.imageUrl ? (
              <img
                src={publicidad.imageUrl}
                alt={publicidad.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Megaphone className="w-12 h-12 text-slate-400" />
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {publicidad.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
              {publicidad.description}
            </p>
            {publicidad.ctaUrl && publicidad.ctaLabel && (
              <a
                href={publicidad.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-white text-sm transition-opacity hover:opacity-95 ${
                  publicidad.ctaType === 'whatsapp'
                    ? 'bg-[#25D366] hover:bg-[#20BD5A]'
                    : 'bg-gradient-to-r from-[#f09433] via-[#e1306c] to-[#833ab4]'
                }`}
              >
                {publicidad.ctaType === 'whatsapp' ? (
                  <MessageCircle className="w-5 h-5" />
                ) : (
                  <Instagram className="w-5 h-5" />
                )}
                {publicidad.ctaLabel}
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
