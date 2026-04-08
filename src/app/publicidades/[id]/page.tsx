import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Megaphone } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/app/components/ui/button'
import { getActivePublicidadDisplayById } from '@/lib/server/active-publicidad-by-id'
import { createClient } from '@/lib/supabase/server'
import { getPublicidadImageUrls } from '@/lib/publicidad-display'
import { PublicidadContactLinks } from '@/components/PublicidadContactLinks'

async function getPublicidadCategoryLabel(slug: string): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase.from('publicidad_categories').select('label').eq('slug', slug).maybeSingle()
  return (data as { label?: string } | null)?.label ?? slug
}

type PageProps = { params: Promise<{ id: string }> }

/** Sin caché: el permalink debe reflejar estado actual (activa / vencida). */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const p = await getActivePublicidadDisplayById(id)
  if (!p) return { title: 'Publicidad no disponible · CST Comunidad' }
  return { title: `${p.title} · Publicidad` }
}

export default async function PublicidadPermalinkPage({ params }: PageProps) {
  const { id } = await params
  const p = await getActivePublicidadDisplayById(id)

  if (!p) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl p-4 lg:p-6">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/publicidades" className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="min-w-0 truncate text-xl font-bold text-slate-900 dark:text-white">Publicidad</h1>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
            <p className="font-medium text-slate-900 dark:text-white">Esta publicidad no está disponible</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              Puede haber finalizado o el enlace no es válido.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/publicidades">Ver publicidades</Link>
              </Button>
              <Button asChild>
                <Link href="/">Ir al inicio</Link>
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const categoryLabel = await getPublicidadCategoryLabel(p.category)
  const images = getPublicidadImageUrls(p)
  const cover = images[0]

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl p-4 lg:p-6">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/publicidades" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="min-w-0 truncate text-xl font-bold text-slate-900 dark:text-white">Publicidad</h1>
        </div>

        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
          <div className="aspect-video overflow-hidden bg-slate-200 dark:bg-gray-700">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={p.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Megaphone className="h-14 w-14 text-slate-400" aria-hidden />
              </div>
            )}
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            <p className="w-fit rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200/90">
              {categoryLabel}
            </p>
            <h2 className="text-lg font-semibold leading-snug text-slate-900 dark:text-white">{p.title}</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-gray-300">{p.description}</p>
            <PublicidadContactLinks whatsappUrl={p.whatsappUrl} instagramUrl={p.instagramUrl} />
          </div>
        </article>
      </div>
    </DashboardLayout>
  )
}
