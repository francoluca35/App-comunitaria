import type { ReactNode } from 'react'
import { Dog, AlertTriangle, Megaphone, Package, Newspaper, Filter } from 'lucide-react'

/** Icono y color por slug conocido; el resto usa estilo genérico */
export function getPostCategoryVisual(slug: string): {
  icon: ReactNode
  iconClass: string
} {
  const map: Record<string, { icon: ReactNode; iconClass: string }> = {
    mascotas: {
      icon: <Dog className="w-6 h-6" />,
      iconClass: 'bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400',
    },
    alertas: {
      icon: <AlertTriangle className="w-6 h-6" />,
      iconClass: 'bg-gradient-to-br from-rose-500 to-red-500 dark:from-rose-400 dark:to-red-400',
    },
    avisos: {
      icon: <Megaphone className="w-6 h-6" />,
      iconClass: 'bg-gradient-to-br from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400',
    },
    objetos: {
      icon: <Package className="w-6 h-6" />,
      iconClass: 'bg-gradient-to-br from-purple-500 to-violet-500 dark:from-purple-400 dark:to-violet-400',
    },
    noticias: {
      icon: <Newspaper className="w-6 h-6" />,
      iconClass: 'bg-gradient-to-br from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400',
    },
  }
  return (
    map[slug] ?? {
      icon: <Filter className="w-6 h-6" />,
      iconClass: 'bg-gradient-to-br from-slate-500 to-slate-600 dark:from-slate-400 dark:to-slate-500',
    }
  )
}
