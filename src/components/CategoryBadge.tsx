import { Dog, AlertTriangle, Megaphone, Package, Newspaper } from 'lucide-react'
import { Category } from '@/app/providers'
import { Badge } from '@/app/components/ui/badge'

const CATEGORY_CONFIG: Record<Category, { label: string; icon: React.ReactNode; color: string }> = {
  mascotas: {
    label: 'Mascotas',
    icon: <Dog className="w-3 h-3" />,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  },
  alertas: {
    label: 'Alertas',
    icon: <AlertTriangle className="w-3 h-3" />,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  avisos: {
    label: 'Avisos',
    icon: <Megaphone className="w-3 h-3" />,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  objetos: {
    label: 'Objetos',
    icon: <Package className="w-3 h-3" />,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
  noticias: {
    label: 'Noticias',
    icon: <Newspaper className="w-3 h-3" />,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
}

interface CategoryBadgeProps {
  category: Category
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category]

  return (
    <Badge variant="secondary" className={`${config.color} flex items-center gap-1`}>
      {config.icon}
      {config.label}
    </Badge>
  )
}
