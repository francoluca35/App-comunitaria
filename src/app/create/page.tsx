'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import {
  ArrowLeft,
  AlertTriangle,
  Dog,
  LayoutGrid,
  Megaphone,
  Newspaper,
  Package,
  PenLine,
} from 'lucide-react'
import { CST } from '@/lib/cst-theme'
import { POST_MEDIA_LIMITS } from '@/lib/post-media-limits'

const ICON_CATEGORIES: { slug: string; label: string; Icon: typeof Dog }[] = [
  { slug: 'alertas', label: 'Alertas', Icon: AlertTriangle },
  { slug: 'avisos', label: 'Avisos', Icon: Megaphone },
  { slug: 'objetos', label: 'Objetos', Icon: Package },
  { slug: 'noticias', label: 'Noticias', Icon: Newspaper },
]

export default function CreateHubPage() {
  const router = useRouter()
  const { currentUser, postCategories } = useApp()

  const slugToLabel = (slug: string) => postCategories.find((c) => c.slug === slug)?.label ?? slug

  const iconCategoriesAvailable = ICON_CATEGORIES.filter(
    (row) => row.slug !== 'alertas' && postCategories.some((c) => c.slug === row.slug)
  )

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: CST.fondo }}>
        <Card className="max-w-md w-full border-[#D8D2CC]">
          <CardContent className="p-6 text-center">
            <p className="text-[#2B2B2B] font-medium mb-4">Iniciá sesión para publicar</p>
            <Button onClick={() => router.push('/login')} style={{ backgroundColor: CST.bordo }} className="text-white w-full hover:bg-[#5A000E]">
              Ir a iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto pb-10">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-[#8B0015] font-montserrat-only">Nueva publicación</h1>
            <p className="text-sm text-[#7A5C52]">Elegí con un toque qué querés avisar</p>
          </div>
        </div>

        {postCategories.some((c) => c.slug === 'alertas') && (
          <Link href="/create/alerta" className="block mb-4">
            <Card
              className="gap-0 overflow-hidden border-2 border-red-200 p-0 text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] dark:border-red-900/50"
              style={{
                background: `linear-gradient(105deg, ${CST.bordoDark} 0%, ${CST.bordo} 100%)`,
              }}
            >
              <CardContent className="!p-0">
                <div className="flex items-stretch gap-4 p-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                    <AlertTriangle className="h-9 w-9" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-extrabold leading-tight">Alerta importante</p>
                    <p className="mt-1 text-sm text-white/90 leading-snug">
                      Título, descripción, hasta {POST_MEDIA_LIMITS.maxImagesAlertas} fotos y hasta{' '}
                      {POST_MEDIA_LIMITS.maxVideosAlertas} videos — aviso prioritario con sonido y vibración para todos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href="/create/animales" className="block mb-6">
          <Card
            className="gap-0 overflow-hidden border-2 border-[#E8E0D5] p-0 text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: `linear-gradient(105deg, ${CST.bordo} 0%, ${CST.acento} 100%)`,
            }}
          >
            <CardContent className="!p-0">
              <div className="flex items-stretch gap-4 p-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Dog className="h-9 w-9" strokeWidth={2.25} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold leading-tight">Mascotas</p>
                  <p className="mt-1 text-sm text-white/90 leading-snug">
                    Perdí o encontré — texto armado, ubicación, fecha, teléfono y hasta{' '}
                    {POST_MEDIA_LIMITS.maxImagesMascotas} fotos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <p className="text-xs font-bold uppercase tracking-wider text-[#7A5C52] mb-3 font-montserrat-only">Otras categorías</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {iconCategoriesAvailable.map(({ slug, Icon }) => (
            <Link
              key={slug}
              href={`/create/otro?categoria=${encodeURIComponent(slug)}`}
              className="rounded-2xl border-2 border-[#D8D2CC] bg-white p-4 shadow-sm transition-all hover:border-[#8B0015]/25 hover:shadow-md active:scale-[0.98]"
            >
              <div
                className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl text-white"
                style={{ background: `linear-gradient(145deg, ${CST.bordo} 0%, ${CST.bordoDark} 100%)` }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-[#2B2B2B]">{slugToLabel(slug)}</p>
              <p className="text-[11px] text-[#7A5C52] mt-0.5">
                {slug === 'objetos'
                  ? 'Perdí, encontré, vendo o regalo'
                  : slug === 'noticias'
                    ? `Título, texto, WhatsApp; hasta ${POST_MEDIA_LIMITS.maxImagesNoticias} fotos y ${POST_MEDIA_LIMITS.maxVideosNoticias} video (opcional)`
                    : slug === 'avisos'
                      ? `Título, texto, WhatsApp y hasta ${POST_MEDIA_LIMITS.maxImagesPerPost} fotos o videos`
                      : 'Formulario completo'}
              </p>
            </Link>
          ))}
        </div>

        <Link href="/create/otro">
          <Card className="border-2 border-dashed border-[#D8D2CC] bg-[#F4EFEA] hover:bg-white transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-[#D8D2CC]">
                <LayoutGrid className="h-5 w-5 text-[#7A5C52]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#2B2B2B] flex items-center gap-2">
                  <PenLine className="h-4 w-4 shrink-0 text-[#8B0015]" />
                  Otra categoría / texto libre
                </p>
                <p className="text-xs text-[#7A5C52] mt-0.5">
                  Proponé el nombre de la categoría y el contenido; si la aprueban, se crea en la comunidad
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </DashboardLayout>
  )
}
