import Link from 'next/link'
import { CST } from '@/lib/cst-theme'

/** No usar redirect('/') acá: oculta 404 reales (p. ej. permalink de publicidad) y confunde al usuario. */
export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-lg font-semibold text-slate-900 dark:text-white">No encontramos esta página</p>
      <p className="max-w-sm text-sm text-slate-600 dark:text-gray-400">
        Puede que el enlace esté incompleto o el contenido ya no esté disponible.
      </p>
      <Link
        href="/"
        className="text-sm font-semibold underline underline-offset-2"
        style={{ color: CST.bordo }}
      >
        Ir al inicio
      </Link>
    </div>
  )
}
