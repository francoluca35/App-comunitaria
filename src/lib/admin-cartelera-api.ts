/** Rutas admin sin la palabra «publicidad» (evita bloqueo de chunks/fetch por ad blockers). */
export const ADMIN_CARTELERA_API = '/api/admin/cartelera' as const

export function adminCarteleraItemUrl(id: string): string {
	return `${ADMIN_CARTELERA_API}/${id}`
}

export function adminCarteleraListUrl(status: string): string {
	return `${ADMIN_CARTELERA_API}?status=${encodeURIComponent(status)}`
}
