/** Prefijo por defecto del cuerpo de descripción en publicaciones comunitarias. */
export const DEFAULT_DESCRIPTION_PREFIX = 'hola mario.'

/** Caracteres del prefijo más un espacio antes del texto libre al guardar. */
export function descriptionPrefixReservedLength(): number {
	return DEFAULT_DESCRIPTION_PREFIX.length + 1
}

/** Cuántos caracteres puede escribir el usuario si el total máximo es `totalMax`. */
export function maxEditableCharsForTotal(totalMax: number): number {
	return Math.max(0, totalMax - descriptionPrefixReservedLength())
}

/**
 * Garantiza que el texto comience con el prefijo una sola vez (comparación sin distinguir mayúsculas).
 */
export function ensureDefaultDescriptionPrefix(text: string): string {
	const raw = text.trim()
	const p = DEFAULT_DESCRIPTION_PREFIX.trim()
	if (raw.length === 0) return `${p} `
	const lower = raw.toLowerCase()
	const plower = p.toLowerCase()
	if (lower === plower) return `${p} `
	if (lower.startsWith(`${plower} `) || lower.startsWith(`${plower}\n`)) return raw
	return `${p} ${raw}`
}

/** True si, tras armar la descripción, no hay texto más allá del prefijo (editable vacío o solo espacios). */
export function isDescriptionOnlyDefaultPrefix(editableSuffix: string): boolean {
	const composed = ensureDefaultDescriptionPrefix(editableSuffix).trim()
	return composed.toLowerCase() === DEFAULT_DESCRIPTION_PREFIX.trim().toLowerCase()
}
