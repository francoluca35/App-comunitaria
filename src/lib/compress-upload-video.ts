import { MEDIA_UPLOAD_LIMITS, assertStoredMediaLimit } from '@/lib/media-upload-limits'

type Attempt = {
	maxSide: number
	fps: number
	bitrateScale: number
}

function canTranscodeVideo(): boolean {
	return (
		typeof document !== 'undefined' &&
		typeof URL !== 'undefined' &&
		typeof MediaRecorder !== 'undefined' &&
		typeof HTMLCanvasElement !== 'undefined' &&
		typeof HTMLCanvasElement.prototype.captureStream === 'function'
	)
}

function supportedMimeType(): string {
	const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
	return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function dimensionsFor(video: HTMLVideoElement, maxSide: number): { width: number; height: number } {
	const w = video.videoWidth || 640
	const h = video.videoHeight || 360
	const scale = Math.min(1, maxSide / Math.max(w, h))
	return {
		width: Math.max(2, Math.round((w * scale) / 2) * 2),
		height: Math.max(2, Math.round((h * scale) / 2) * 2),
	}
}

async function loadVideo(file: File): Promise<{ video: HTMLVideoElement; objectUrl: string }> {
	const objectUrl = URL.createObjectURL(file)
	const video = document.createElement('video')
	video.muted = true
	video.playsInline = true
	video.preload = 'metadata'
	video.src = objectUrl
	await new Promise<void>((resolve, reject) => {
		video.onloadedmetadata = () => resolve()
		video.onerror = () => reject(new Error('No se pudo leer el video'))
	})
	return { video, objectUrl }
}

async function transcodeAttempt(file: File, attempt: Attempt): Promise<File> {
	const { video, objectUrl } = await loadVideo(file)
	try {
		const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 8
		const { width, height } = dimensionsFor(video, attempt.maxSide)
		const canvas = document.createElement('canvas')
		canvas.width = width
		canvas.height = height
		const ctx = canvas.getContext('2d')
		if (!ctx) throw new Error('No se pudo preparar la compresión de video')

		const stream = canvas.captureStream(attempt.fps)
		const mimeType = supportedMimeType()
		const targetBits = MEDIA_UPLOAD_LIMITS.maxStoredBytes * 8 * 0.82
		const videoBitsPerSecond = Math.max(120_000, Math.min(850_000, Math.floor((targetBits / duration) * attempt.bitrateScale)))
		const recorder = new MediaRecorder(stream, {
			...(mimeType ? { mimeType } : {}),
			videoBitsPerSecond,
		})
		const chunks: BlobPart[] = []
		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) chunks.push(event.data)
		}

		const draw = () => {
			if (video.paused || video.ended) return
			ctx.drawImage(video, 0, 0, width, height)
			requestAnimationFrame(draw)
		}

		await new Promise<void>((resolve, reject) => {
			recorder.onerror = () => reject(new Error('No se pudo comprimir el video'))
			recorder.onstop = () => resolve()
			video.onended = () => {
				if (recorder.state !== 'inactive') recorder.stop()
			}
			recorder.start(250)
			video.currentTime = 0
			video.play().then(() => {
				draw()
			}).catch(() => reject(new Error('No se pudo reproducir el video para comprimirlo')))
		})

		const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' })
		const name = file.name.replace(/\.[^.]+$/, '') || 'video'
		return new File([blob], `${name}.webm`, { type: blob.type || 'video/webm' })
	} finally {
		URL.revokeObjectURL(objectUrl)
	}
}

export async function compressVideoForCommunityUpload(file: File): Promise<File> {
	if (file.size > MEDIA_UPLOAD_LIMITS.maxVideoInputBytes) {
		throw new Error(`${file.name} supera ${MEDIA_UPLOAD_LIMITS.maxVideoInputMbLabel}`)
	}
	if (file.size <= MEDIA_UPLOAD_LIMITS.maxStoredBytes) return file
	if (!canTranscodeVideo()) {
		throw new Error(`Tu navegador no permite comprimir videos. Subí un video de ${MEDIA_UPLOAD_LIMITS.maxStoredMbLabel} o menos.`)
	}

	const attempts: Attempt[] = [
		{ maxSide: 540, fps: 18, bitrateScale: 1 },
		{ maxSide: 420, fps: 15, bitrateScale: 0.72 },
		{ maxSide: 320, fps: 12, bitrateScale: 0.48 },
	]

	let last: File | null = null
	for (const attempt of attempts) {
		last = await transcodeAttempt(file, attempt)
		if (last.size <= MEDIA_UPLOAD_LIMITS.maxStoredBytes) return last
	}

	assertStoredMediaLimit(last ?? file, file.name)
	return last ?? file
}
