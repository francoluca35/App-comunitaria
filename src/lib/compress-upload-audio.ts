import { MEDIA_UPLOAD_LIMITS } from '@/lib/media-upload-limits'

/**
 * Valida audio de chat antes de subir. La grabación ya usa bitrate bajo;
 * si aún supera el límite, se rechaza con mensaje claro.
 */
export function assertChatAudioUploadLimit(blob: Blob): void {
	if (blob.size > MEDIA_UPLOAD_LIMITS.maxAudioStoredBytes) {
		throw new Error(`El audio debe pesar ${MEDIA_UPLOAD_LIMITS.maxStoredMbLabel} o menos`)
	}
}
