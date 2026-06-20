/** Prefijos móviles por provincia (Argentina) para armar WhatsApp +54 9 … */

export const ARGENTINA_COUNTRY_PREFIX = '+54'
export const DEFAULT_ARGENTINA_PROVINCE_PREFIX = '342' // Santa Fe (Santo Tomé)
export const MIN_ARGENTINA_AREA_DIGITS = 2
export const MAX_ARGENTINA_AREA_DIGITS = 4
export const MAX_ARGENTINA_LOCAL_DIGITS = 13

export const ARGENTINA_PROVINCE_PREFIXES = [
	{ province: 'CABA / AMBA', code: '11' },
	{ province: 'Buenos Aires', code: '221' },
	{ province: 'Catamarca', code: '383' },
	{ province: 'Chaco', code: '362' },
	{ province: 'Chubut', code: '280' },
	{ province: 'Córdoba', code: '351' },
	{ province: 'Corrientes', code: '379' },
	{ province: 'Entre Ríos', code: '343' },
	{ province: 'Formosa', code: '370' },
	{ province: 'Jujuy', code: '388' },
	{ province: 'La Pampa', code: '2954' },
	{ province: 'La Rioja', code: '380' },
	{ province: 'Mendoza', code: '261' },
	{ province: 'Misiones', code: '376' },
	{ province: 'Neuquén', code: '299' },
	{ province: 'Río Negro', code: '2920' },
	{ province: 'Salta', code: '387' },
	{ province: 'San Juan', code: '264' },
	{ province: 'San Luis', code: '266' },
	{ province: 'Santa Cruz', code: '2966' },
	{ province: 'Santa Fe', code: '342' },
	{ province: 'Santiago del Estero', code: '385' },
	{ province: 'Tierra del Fuego', code: '2901' },
	{ province: 'Tucumán', code: '381' },
] as const

const PREFIX_CODES_LONGEST_FIRST = [...ARGENTINA_PROVINCE_PREFIXES]
	.map((p) => p.code)
	.sort((a, b) => b.length - a.length)

export const MAX_ARGENTINA_MOBILE_INPUT_DIGITS = MAX_ARGENTINA_AREA_DIGITS + MAX_ARGENTINA_LOCAL_DIGITS

/** Normaliza lo que el usuario escribe en el input único (sin +54 9). Acepta pegar +549… */
export function normalizeArgentinaMobileInput(raw: string): string {
	let d = raw.replace(/\D/g, '')
	if (d.startsWith('549')) {
		d = d.slice(3)
	} else if (d.startsWith('54')) {
		const after54 = d.slice(2)
		d = after54.startsWith('9') ? after54.slice(1) : after54
	}
	d = d.replace(/^0+/, '').replace(/^15/, '')
	return d.slice(0, MAX_ARGENTINA_MOBILE_INPUT_DIGITS)
}

/** Separa código de área y número local desde el input único. */
export function parseArgentinaMobileInput(
	digits: string
): { prefix: string; local: string } {
	const d = normalizeArgentinaMobileInput(digits)
	if (!d) return { prefix: '', local: '' }

	for (const code of PREFIX_CODES_LONGEST_FIRST) {
		if (d.startsWith(code) && d.length > code.length) {
			return { prefix: code, local: d.slice(code.length) }
		}
	}

	if (d.length <= MAX_ARGENTINA_AREA_DIGITS) {
		return { prefix: d, local: '' }
	}

	const maxAreaLen = Math.min(MAX_ARGENTINA_AREA_DIGITS, d.length - 1)
	for (let areaLen = maxAreaLen; areaLen >= MIN_ARGENTINA_AREA_DIGITS; areaLen--) {
		const local = d.slice(areaLen)
		if (local.length >= 1 && local.length <= MAX_ARGENTINA_LOCAL_DIGITS) {
			return { prefix: d.slice(0, areaLen), local }
		}
	}

	return { prefix: d, local: '' }
}

export function formatArgentinaMobileInputValue(prefix: string, local: string): string {
	return `${prefix}${local}`
}

export function validateArgentinaMobileInput(digits: string): boolean {
	const { prefix, local } = parseArgentinaMobileInput(digits)
	return validateArgentinaAreaCode(prefix) && validateArgentinaLocalDigits(local)
}

/** Quita 0 inicial del código de área. */
export function normalizeArgentinaAreaCode(raw: string): string {
	return raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_ARGENTINA_AREA_DIGITS)
}

export function validateArgentinaAreaCode(areaCode: string): boolean {
	const code = normalizeArgentinaAreaCode(areaCode)
	return code.length >= MIN_ARGENTINA_AREA_DIGITS && code.length <= MAX_ARGENTINA_AREA_DIGITS
}

/** Quita 0 inicial y prefijo 15 típico del celular argentino. */
export function normalizeArgentinaLocalDigits(raw: string): string {
	return raw.replace(/\D/g, '').replace(/^0+/, '').replace(/^15/, '')
}

export function validateArgentinaLocalDigits(localDigits: string): boolean {
	const d = normalizeArgentinaLocalDigits(localDigits)
	return d.length >= 6 && d.length <= MAX_ARGENTINA_LOCAL_DIGITS
}

/** E.164 móvil Argentina: +549 + código de área + número local. */
export function buildArgentinaMobileE164(
	provincePrefix: string,
	localRaw: string
): string | null {
	const local = normalizeArgentinaLocalDigits(localRaw)
	if (!local) return null
	if (local.length > MAX_ARGENTINA_LOCAL_DIGITS) return null
	const code = normalizeArgentinaAreaCode(provincePrefix)
	if (!validateArgentinaAreaCode(code)) return null
	return `${ARGENTINA_COUNTRY_PREFIX}9${code}${local}`
}

export function formatArgentinaMobileForDisplay(e164: string | null | undefined): string {
	if (!e164?.trim()) return ''
	const parsed = parseArgentinaMobileStored(e164)
	if (!parsed) return e164.trim()
	const { prefix, local } = parsed
	if (!local) return e164.trim()
	return `${ARGENTINA_COUNTRY_PREFIX} 9 ${prefix} ${local}`
}

/** Separa un número guardado (+549… o variantes) en prefijo provincial y parte local. */
export function parseArgentinaMobileStored(
	phone: string | null | undefined
): { prefix: string; local: string } | null {
	if (!phone?.trim()) return null
	let digits = phone.replace(/\D/g, '')
	if (!digits) return null

	if (digits.startsWith('549')) {
		digits = digits.slice(3)
	} else if (digits.startsWith('54')) {
		const after54 = digits.slice(2)
		digits = after54.startsWith('9') ? after54.slice(1) : after54
	}

	for (const code of PREFIX_CODES_LONGEST_FIRST) {
		if (digits.startsWith(code)) {
			return { prefix: code, local: digits.slice(code.length) }
		}
	}

	const maxAreaLen = Math.min(MAX_ARGENTINA_AREA_DIGITS, digits.length - 6)
	for (let areaLen = maxAreaLen; areaLen >= MIN_ARGENTINA_AREA_DIGITS; areaLen--) {
		const local = digits.slice(areaLen)
		if (local.length >= 6 && local.length <= MAX_ARGENTINA_LOCAL_DIGITS) {
			return { prefix: digits.slice(0, areaLen), local }
		}
	}

	return { prefix: DEFAULT_ARGENTINA_PROVINCE_PREFIX, local: digits }
}
