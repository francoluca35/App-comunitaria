import type { ReactNode } from 'react'
import { Dog, AlertTriangle, Megaphone, Package, Newspaper, Filter, UserSearch } from 'lucide-react'

const NEUTRAL_ICON_WRAP =
  'flex items-center justify-center rounded-xl bg-[#EDEAE7] text-[#3D3D3D] dark:bg-[#2a2a2a] dark:text-[#e5e5e5]'

/** Icono por slug; envoltorio neutro (sin gradientes ni color por categoría). */
export function getPostCategoryVisual(slug: string): {
  icon: ReactNode
  iconClass: string
} {
  const map: Record<string, { icon: ReactNode; iconClass: string }> = {
    mascotas: {
      icon: <Dog className="h-6 w-6" />,
      iconClass: NEUTRAL_ICON_WRAP,
    },
    alertas: {
      icon: <AlertTriangle className="h-6 w-6" />,
      iconClass: NEUTRAL_ICON_WRAP,
    },
    extravios: {
      icon: <UserSearch className="h-6 w-6" />,
      iconClass: NEUTRAL_ICON_WRAP,
    },
    avisos: {
      icon: <Megaphone className="h-6 w-6" />,
      iconClass: NEUTRAL_ICON_WRAP,
    },
    objetos: {
      icon: <Package className="h-6 w-6" />,
      iconClass: NEUTRAL_ICON_WRAP,
    },
    noticias: {
      icon: <Newspaper className="h-6 w-6" />,
      iconClass: NEUTRAL_ICON_WRAP,
    },
  }
  return (
    map[slug] ?? {
      icon: <Filter className="h-6 w-6" />,
      iconClass: NEUTRAL_ICON_WRAP,
    }
  )
}
