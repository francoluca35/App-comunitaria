const BIRTH_DATE_DISPLAY_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/

/** Formatea dígitos sueltos como DD/MM/AAAA mientras el usuario escribe. */
export function maskBirthDateInput(raw: string): string {
	const digits = raw.replace(/\D/g, '').slice(0, 8)
	if (digits.length <= 2) return digits
	if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
	return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function isCompleteBirthDateDisplay(value: string): boolean {
	return BIRTH_DATE_DISPLAY_RE.test(value)
}

/** Convierte DD/MM/AAAA a YYYY-MM-DD si la fecha es válida. */
export function birthDateDisplayToIso(value: string): string | null {
	const match = value.match(BIRTH_DATE_DISPLAY_RE)
	if (!match) return null

	const day = parseInt(match[1], 10)
	const month = parseInt(match[2], 10)
	const year = parseInt(match[3], 10)
	const currentYear = new Date().getFullYear()

	if (month < 1 || month > 12 || day < 1 || day > 31) return null
	if (year < 1900 || year > currentYear) return null

	const date = new Date(year, month - 1, day)
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null
	}

	const mm = String(month).padStart(2, '0')
	const dd = String(day).padStart(2, '0')
	return `${year}-${mm}-${dd}`
}

export function isAtLeast17FromIsoDate(isoDate: string): boolean {
	const birth = new Date(`${isoDate}T12:00:00`)
	const today = new Date()
	let age = today.getFullYear() - birth.getFullYear()
	const monthDiff = today.getMonth() - birth.getMonth()
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
	return age >= 17
}
