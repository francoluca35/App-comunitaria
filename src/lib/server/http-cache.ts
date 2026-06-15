/** Cabeceras Cache-Control reutilizables en rutas API de lectura pública. */
export const HTTP_CACHE_PUBLIC_SHORT = {
	'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
} as const

/** Categorías y datos que cambian poco. */
export const HTTP_CACHE_PUBLIC_CATEGORIES = {
	'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
} as const
