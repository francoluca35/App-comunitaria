/** Clave en public.app_config (jsonb: { alias?: string, cbu?: string }). */
export const PUBLICIDAD_DATOS_PAGO_CONFIG_KEY = 'publicidad_datos_pago' as const

export type PublicidadDatosPago = {
	alias: string
	cbu: string
}

export function parsePublicidadDatosPagoJsonb(value: unknown): PublicidadDatosPago {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return { alias: '', cbu: '' }
	}
	const row = value as Record<string, unknown>
	const alias = typeof row.alias === 'string' ? row.alias.trim() : ''
	const cbu = typeof row.cbu === 'string' ? row.cbu.trim() : ''
	return { alias, cbu }
}

export function formatPublicidadDatosPagoBody(datos: PublicidadDatosPago): string {
	const lines: string[] = []
	if (datos.alias) lines.push(`Alias: ${datos.alias}`)
	if (datos.cbu) lines.push(`CBU: ${datos.cbu}`)
	return lines.join('\n')
}

export function hasPublicidadDatosPago(datos: PublicidadDatosPago): boolean {
	return Boolean(datos.alias || datos.cbu)
}
