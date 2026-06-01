export const MEDIA_UPLOAD_LIMITS = {
	maxStoredBytes: 1.5 * 1024 * 1024,
	maxImageInputBytes: 5 * 1024 * 1024,
	maxVideoInputBytes: 8 * 1024 * 1024,
	maxAudioStoredBytes: 1.5 * 1024 * 1024,
	/** Publicaciones de venta: una sola foto, máximo 1 MB al subir. */
	ventaMaxStoredBytes: 1 * 1024 * 1024,
	/** ~24 kbps × duración; margen para que el blob grabado no supere 1.5 MB. */
	maxAudioDurationMs: 4 * 60 * 1000,
	maxStoredMbLabel: '1.5 MB',
	maxImageInputMbLabel: '5 MB',
	maxVideoInputMbLabel: '8 MB',
	ventaMaxStoredMbLabel: '1 MB',
} as const

export function bytesToMb(bytes: number): number {
	return bytes / (1024 * 1024)
}

export function isWithinStoredMediaLimit(file: Blob): boolean {
	return file.size <= MEDIA_UPLOAD_LIMITS.maxStoredBytes
}

export function assertStoredMediaLimit(file: Blob, label = 'El archivo'): void {
	if (!isWithinStoredMediaLimit(file)) {
		throw new Error(`${label} debe pesar ${MEDIA_UPLOAD_LIMITS.maxStoredMbLabel} o menos después de optimizarse.`)
	}
}
