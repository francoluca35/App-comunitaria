import { MEDIA_UPLOAD_LIMITS, assertStoredMediaLimit } from '@/lib/media-upload-limits'

type Attempt = {
	maxSide: number
	fps: number
	bitrateScale: number
}

type AudioCapture = {
	stream: MediaStream | null
	cleanup: () => void
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

function supportedMimeType(requireAudio: boolean): string {
	const candidates = requireAudio
		? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9', 'video/webm']
		: ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
	return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function captureElementStream(video: HTMLVideoElement): MediaStream | null {
	if (typeof video.captureStream === 'function') {
		return video.captureStream()
	}
	const legacy = video as HTMLVideoElement & { mozCaptureStream?: () => MediaStream }
	if (typeof legacy.mozCaptureStream === 'function') {
		return legacy.mozCaptureStream()
	}
	return null
}

function setupAudioCapture(video: HTMLVideoElement): AudioCapture {
	const cleanups: Array<() => void> = []
	try {
		const AudioCtx =
			typeof AudioContext !== 'undefined'
				? AudioContext
				: (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
		if (AudioCtx) {
			const ctx = new AudioCtx()
			cleanups.push(() => {
				void ctx.close()
			})
			const source = ctx.createMediaElementSource(video)
			const destination = ctx.createMediaStreamDestination()
			source.connect(destination)
			return {
				stream: destination.stream,
				cleanup: () => {
					for (const fn of cleanups) fn()
				},
			}
		}
	} catch {
		for (const fn of cleanups) fn()
	}

	return {
		stream: captureElementStream(video),
		cleanup: () => {},
	}
}

function resolveAudioStream(sourceVideo: HTMLVideoElement, webAudio: AudioCapture): MediaStream | null {
	const webAudioTracks = webAudio.stream?.getAudioTracks() ?? []
	if (webAudioTracks.length > 0) return webAudio.stream

	const elementStream = captureElementStream(sourceVideo)
	const elementTracks = elementStream?.getAudioTracks() ?? []
	if (elementTracks.length > 0) return elementStream

	return null
}

function combineVideoWithAudio(canvasStream: MediaStream, audioStream: MediaStream | null): MediaStream {
	const combined = new MediaStream()
	canvasStream.getVideoTracks().forEach((track) => combined.addTrack(track))
	audioStream?.getAudioTracks().forEach((track) => combined.addTrack(track))
	return combined
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

function bitratesForDuration(durationSec: number, bitrateScale: number): { videoBitsPerSecond: number; audioBitsPerSecond: number } {
	const targetBits = MEDIA_UPLOAD_LIMITS.maxStoredBytes * 8 * 0.8
	const totalBps = Math.max(90_000, Math.floor((targetBits / durationSec) * bitrateScale))
	const audioBitsPerSecond = Math.max(20_000, Math.min(56_000, Math.floor(totalBps * 0.24)))
	const videoBitsPerSecond = Math.max(60_000, totalBps - audioBitsPerSecond)
	return { videoBitsPerSecond, audioBitsPerSecond }
}

async function loadVideo(file: File): Promise<{ video: HTMLVideoElement; objectUrl: string }> {
	const objectUrl = URL.createObjectURL(file)
	const video = document.createElement('video')
	video.muted = false
	video.playsInline = true
	video.preload = 'auto'
	video.src = objectUrl
	await new Promise<void>((resolve, reject) => {
		video.onloadeddata = () => resolve()
		video.onerror = () => reject(new Error('No se pudo leer el video'))
	})
	return { video, objectUrl }
}

async function transcodeAttempt(file: File, attempt: Attempt): Promise<File> {
	const { video, objectUrl } = await loadVideo(file)
	const webAudio = setupAudioCapture(video)
	try {
		const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 8
		const { width, height } = dimensionsFor(video, attempt.maxSide)
		const canvas = document.createElement('canvas')
		canvas.width = width
		canvas.height = height
		const ctx = canvas.getContext('2d')
		if (!ctx) throw new Error('No se pudo preparar la compresión de video')

		const canvasStream = canvas.captureStream(attempt.fps)
		const { videoBitsPerSecond, audioBitsPerSecond } = bitratesForDuration(duration, attempt.bitrateScale)
		const chunks: BlobPart[] = []
		let recorderMimeType = 'video/webm'

		const draw = () => {
			if (video.paused || video.ended) return
			ctx.drawImage(video, 0, 0, width, height)
			requestAnimationFrame(draw)
		}

		await new Promise<void>((resolve, reject) => {
			let recorder: MediaRecorder | null = null
			const stopRecording = () => {
				if (recorder && recorder.state !== 'inactive') recorder.stop()
			}

			video.onended = stopRecording
			video.currentTime = 0
			video.play().then(() => {
				const audioStream = resolveAudioStream(video, webAudio)
				const hasAudio = (audioStream?.getAudioTracks().length ?? 0) > 0
				const stream = combineVideoWithAudio(canvasStream, audioStream)
				const mimeType = supportedMimeType(hasAudio)
				recorder = new MediaRecorder(stream, {
					...(mimeType ? { mimeType } : {}),
					videoBitsPerSecond,
					...(hasAudio ? { audioBitsPerSecond } : {}),
				})
				recorderMimeType = recorder.mimeType || recorderMimeType
				recorder.ondataavailable = (event) => {
					if (event.data.size > 0) chunks.push(event.data)
				}
				recorder.onerror = () => reject(new Error('No se pudo comprimir el video'))
				recorder.onstop = () => resolve()
				recorder.start(250)
				draw()
			}).catch(() => reject(new Error('No se pudo reproducir el video para comprimirlo')))
		})

		const blob = new Blob(chunks, { type: recorderMimeType })
		const name = file.name.replace(/\.[^.]+$/, '') || 'video'
		return new File([blob], `${name}.webm`, { type: blob.type || 'video/webm' })
	} finally {
		webAudio.cleanup()
		URL.revokeObjectURL(objectUrl)
	}
}

const COMPRESSION_ATTEMPTS: Attempt[] = [
	{ maxSide: 540, fps: 18, bitrateScale: 1 },
	{ maxSide: 480, fps: 16, bitrateScale: 0.85 },
	{ maxSide: 420, fps: 15, bitrateScale: 0.72 },
	{ maxSide: 360, fps: 12, bitrateScale: 0.58 },
	{ maxSide: 320, fps: 12, bitrateScale: 0.48 },
	{ maxSide: 280, fps: 10, bitrateScale: 0.38 },
	{ maxSide: 240, fps: 8, bitrateScale: 0.3 },
	{ maxSide: 200, fps: 6, bitrateScale: 0.24 },
]

export async function compressVideoForCommunityUpload(file: File): Promise<File> {
	if (file.size > MEDIA_UPLOAD_LIMITS.maxVideoInputBytes) {
		throw new Error(`${file.name} supera ${MEDIA_UPLOAD_LIMITS.maxVideoInputMbLabel}`)
	}
	if (file.size <= MEDIA_UPLOAD_LIMITS.maxStoredBytes) return file
	if (!canTranscodeVideo()) {
		throw new Error(`Tu navegador no permite comprimir videos. Subí un video de ${MEDIA_UPLOAD_LIMITS.maxStoredMbLabel} o menos.`)
	}

	let last: File | null = null
	for (const attempt of COMPRESSION_ATTEMPTS) {
		last = await transcodeAttempt(file, attempt)
		if (last.size <= MEDIA_UPLOAD_LIMITS.maxStoredBytes) return last
	}

	assertStoredMediaLimit(last ?? file, file.name)
	return last ?? file
}
