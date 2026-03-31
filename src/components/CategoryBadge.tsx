import { Dog, AlertTriangle, Megaphone, Package, Newspaper, Tag } from 'lucide-react'
import { useApp } from '@/app/providers'
import { Badge } from '@/app/components/ui/badge'

const ICON_BY_SLUG: Record<string, React.ReactNode> = {
  mascotas: <Dog className="w-3 h-3" />,
  alertas: <AlertTriangle className="w-3 h-3" />,
  avisos: <Megaphone className="w-3 h-3" />,
  objetos: <Package className="w-3 h-3" />,
  noticias: <Newspaper className="w-3 h-3" />,
}

const COLOR_BY_SLUG: Record<string, string> = {
  mascotas: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  alertas: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  avisos: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  objetos: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  noticias: 'bg-[#7A5C52]/12 text-[#5c453e] dark:bg-[#7A5C52]/22 dark:text-stone-200',
}

interface CategoryBadgeProps {
  category: string
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const { postCategories } = useApp()
  const label = postCategories.find((c) => c.slug === category)?.label ?? category
  const icon = ICON_BY_SLUG[category] ?? <Tag className="w-3 h-3" />
  const color =
    COLOR_BY_SLUG[category] ?? 'bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300'

  return (
    <Badge variant="secondary" className={`${color} flex items-center gap-1`}>
      {icon}
      {label}
    </Badge>
  )
}
