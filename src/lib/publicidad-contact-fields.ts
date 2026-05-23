import {
	buildArgentinaMobileE164,
	parseArgentinaMobileStored,
	DEFAULT_ARGENTINA_PROVINCE_PREFIX,
} from '@/lib/argentina-phone'

/** @deprecated Usar phonePrefixAndLocalFromStored */
export function phoneDigitsFromStored(phone: string | null | undefined): string {
	const parsed = parseArgentinaMobileStored(phone)
	if (!parsed) return ''
	const { prefix, local } = parsed
	return local ? `9${prefix}${local}` : ''
}

export function phonePrefixAndLocalFromStored(phone: string | null | undefined): {
	prefix: string
	local: string
} {
	const parsed = parseArgentinaMobileStored(phone)
	return parsed ?? { prefix: DEFAULT_ARGENTINA_PROVINCE_PREFIX, local: '' }
}

/** Guardar como +549 + prefijo + local; null si vacío. */
export function phoneStoredFromPrefixAndLocal(prefix: string, local: string): string | null {
	return buildArgentinaMobileE164(prefix, local)
}

/** @deprecated Usar phoneStoredFromPrefixAndLocal */
export function phoneStoredFromDigits(digits: string): string | null {
	const d = digits.replace(/\D/g, '')
	if (!d) return null
	if (d.startsWith('549')) return `+${d}`
	if (d.startsWith('54')) return `+${d}`
	return `+54${d.startsWith('9') ? d : `9${d}`}`
}

/** Handle sin @ (para el input con prefijo fijo). */
export function instagramLocalFromStored(raw: string | null | undefined): string {
	if (!raw) return ''
	const t = raw.trim()
	try {
		if (t.startsWith('http://') || t.startsWith('https://')) {
			const u = new URL(t)
			const parts = u.pathname.split('/').filter(Boolean)
			const h = parts[0] ?? ''
			return h.replace(/^@/, '')
		}
	} catch {
		// ignore
	}
	return t.replace(/^@+/, '').trim()
}

/** Valor a persistir: @handle o null. */
export function instagramStoredFromLocal(local: string): string | null {
	const h = local.trim().replace(/^@+/, '').trim()
	if (!h) return null
	return `@${h}`
}
