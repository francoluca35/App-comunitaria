import {
	Dog,
	AlertTriangle,
	UserSearch,
	Megaphone,
	Package,
	Newspaper,
	Sparkles,
	Tag,
} from 'lucide-react'
import { useApp } from '@/app/providers'
import { Badge } from '@/app/components/ui/badge'

const ICON_BY_SLUG: Record<string, React.ReactNode> = {
  mascotas: <Dog className="h-3 w-3" />,
  alertas: <AlertTriangle className="h-3 w-3" />,
  extravios: <UserSearch className="h-3 w-3" />,
  avisos: <Megaphone className="h-3 w-3" />,
  objetos: <Package className="h-3 w-3" />,
  noticias: <Newspaper className="h-3 w-3" />,
  propuesta: <Sparkles className="h-3 w-3" />,
}

interface CategoryBadgeProps {
  category: string
  /** Junto al nombre en una línea: más chico y menos padding */
  compact?: boolean
}

/** Chip neutro: solo icono de categoría + nombre (sin colores por tipo). */
export function CategoryBadge({ category, compact }: CategoryBadgeProps) {
  const { postCategories } = useApp()
  const label = postCategories.find((c) => c.slug === category)?.label ?? category
  const icon = ICON_BY_SLUG[category] ?? <Tag className="h-3 w-3" />

  return (
    <Badge
      variant="outline"
      className={`border-[#D4CEC8] bg-[#FAF8F6] text-[#3D3D3D] shadow-none flex items-center font-medium ${compact ? 'h-6 gap-0.5 px-2 py-0 text-[11px] leading-none' : 'gap-1'}`}
    >
      {icon}
      {label}
    </Badge>
  )
}
