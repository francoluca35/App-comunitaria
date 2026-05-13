'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Camera, Mic, Paperclip, Pause, Play, Send, Smile, Trash2 } from 'lucide-react'
import { cn } from '@/app/components/ui/utils'
import { toast } from 'sonner'
import { useVisualViewportKeyboardOverlap } from '@/hooks/useVisualViewportKeyboardOverlap'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover'

const QUICK_EMOJIS = ['😀', '😂', '❤️', '👍', '🔥', '😊', '🙏', '👏', '😮', '😢', '🎉', '✨', '👋', '💬', '📷']
const WAVE_BARS = 28

type RecordPhase = 'idle' | 'recording' | 'paused'

function pickRecorderMime(): string {
	if (typeof MediaRecorder === 'undefined') return ''
	if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
	if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
	return ''
}

function formatMmSs(ms: number): string {
	const totalSec = Math.max(0, Math.floor(ms / 1000))
	const m = Math.floor(totalSec / 60)
	const s = totalSec % 60
	return `${m}:${s.toString().padStart(2, '0')}`
}

function RecordingWaveform({ levels, paused }: { levels: number[]; paused: boolean }) {
	return (
		<div className="flex min-w-0 flex-1 items-center justify-center gap-[3px] px-1" aria-hidden>
			{levels.map((lvl, i) => {
				const h = Math.max(3, Math.round(3 + lvl * 26))
				return (
					<span
						key={i}
						className={cn(
							'w-[3px] shrink-0 rounded-full transition-[height,opacity,background-color] duration-100',
							paused
								? 'bg-slate-400/45 dark:bg-[#8696A0]/40'
								: 'bg-slate-600/80 dark:bg-[#AEBAC1]'
						)}
						style={{
							height: `${h}px`,
							opacity: paused ? 0.5 : 0.35 + lvl * 0.65,
						}}
					/>
				)
			})}
		</div>
	)
}

export function WhatsAppComposer({
	value,
	onChange,
	onSubmitText,
	sending,
	disabled,
	onSendVoice,
	onSendImage,
}: {
	value: string
	onChange: (v: string) => void
	onSubmitText: () => void
	sending: boolean
	disabled?: boolean
	onSendVoice: (blob: Blob, durationSec: number) => Promise<void>
	onSendImage?: (file: File) => Promise<void>
}) {
	const [recordPhase, setRecordPhase] = useState<RecordPhase>('idle')
	const [recordMs, setRecordMs] = useState(0)
	const [waveLevels, setWaveLevels] = useState<number[]>(() => Array(WAVE_BARS).fill(0.15))
	const [emojiOpen, setEmojiOpen] = useState(false)

	const recorderRef = useRef<MediaRecorder | null>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const chunksRef = useRef<BlobPart[]>([])
	const mimeRef = useRef('')
	const elapsedMsRef = useRef(0)
	const segmentStartRef = useRef(0)
	const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const galleryInputRef = useRef<HTMLInputElement | null>(null)
	const cameraInputRef = useRef<HTMLInputElement | null>(null)
	const audioCtxRef = useRef<AudioContext | null>(null)
	const analyserRef = useRef<AnalyserNode | null>(null)
	const waveRafRef = useRef<number | null>(null)
	const waveHistoryRef = useRef<number[]>(Array(WAVE_BARS).fill(0.08))
	const phaseRef = useRef<RecordPhase>('idle')

	const stopWaveLoop = useCallback(() => {
		if (waveRafRef.current != null) {
			cancelAnimationFrame(waveRafRef.current)
			waveRafRef.current = null
		}
	}, [])

	const stopAudioAnalyser = useCallback(() => {
		stopWaveLoop()
		try {
			audioCtxRef.current?.close()
		} catch {
			// ignore
		}
		audioCtxRef.current = null
		analyserRef.current = null
	}, [stopWaveLoop])

	const stopStreams = useCallback(() => {
		streamRef.current?.getTracks().forEach((t) => t.stop())
		streamRef.current = null
		recorderRef.current = null
		chunksRef.current = []
		if (tickRef.current) {
			clearInterval(tickRef.current)
			tickRef.current = null
		}
		stopAudioAnalyser()
	}, [stopAudioAnalyser])

	const resetRecordingState = useCallback(() => {
		elapsedMsRef.current = 0
		segmentStartRef.current = 0
		phaseRef.current = 'idle'
		setRecordPhase('idle')
		setRecordMs(0)
		waveHistoryRef.current = Array(WAVE_BARS).fill(0.08)
		setWaveLevels(Array(WAVE_BARS).fill(0.08))
	}, [])

	const getElapsedMs = useCallback(() => {
		if (phaseRef.current === 'recording') {
			return elapsedMsRef.current + (Date.now() - segmentStartRef.current)
		}
		return elapsedMsRef.current
	}, [])

	const startWaveLoop = useCallback(() => {
		const analyser = analyserRef.current
		if (!analyser) return
		const timeBuf = new Uint8Array(analyser.fftSize)
		const step = () => {
			if (phaseRef.current !== 'recording') {
				waveRafRef.current = null
				return
			}
			analyser.getByteTimeDomainData(timeBuf)
			let sumSq = 0
			for (let i = 0; i < timeBuf.length; i++) {
				const n = (timeBuf[i] - 128) / 128
				sumSq += n * n
			}
			const rms = Math.sqrt(sumSq / timeBuf.length)
			const amp = Math.min(1, rms * 3.2)

			const hist = waveHistoryRef.current
			hist.shift()
			hist.push(amp)

			const next = hist.map((v, i) => {
				const neighbor = (hist[i - 1] ?? v) + (hist[i + 1] ?? v)
				return Math.min(1, v * 0.72 + neighbor * 0.14)
			})
			waveHistoryRef.current = next
			setWaveLevels([...next])
			waveRafRef.current = requestAnimationFrame(step)
		}
		waveRafRef.current = requestAnimationFrame(step)
	}, [])

	const cancelRecording = useCallback(() => {
		const rec = recorderRef.current
		if (rec && rec.state !== 'inactive') {
			rec.onstop = null
			try {
				rec.stop()
			} catch {
				// ignore
			}
		}
		stopStreams()
		resetRecordingState()
	}, [resetRecordingState, stopStreams])

	const togglePause = useCallback(() => {
		const rec = recorderRef.current
		if (!rec) return

		if (phaseRef.current === 'recording') {
			elapsedMsRef.current += Date.now() - segmentStartRef.current
			if (typeof rec.pause === 'function' && rec.state === 'recording') {
				rec.pause()
			}
			stopWaveLoop()
			phaseRef.current = 'paused'
			setRecordPhase('paused')
			setRecordMs(elapsedMsRef.current)
			return
		}

		if (phaseRef.current === 'paused') {
			segmentStartRef.current = Date.now()
			if (typeof rec.resume === 'function' && rec.state === 'paused') {
				rec.resume()
			}
			phaseRef.current = 'recording'
			setRecordPhase('recording')
			startWaveLoop()
		}
	}, [startWaveLoop, stopWaveLoop])

	const sendRecording = useCallback(async () => {
		if (phaseRef.current === 'idle') return
		const rec = recorderRef.current
		if (!rec || rec.state === 'inactive') {
			cancelRecording()
			return
		}

		if (tickRef.current) {
			clearInterval(tickRef.current)
			tickRef.current = null
		}

		if (phaseRef.current === 'recording') {
			elapsedMsRef.current += Date.now() - segmentStartRef.current
		}
		const durationSec = elapsedMsRef.current / 1000

		phaseRef.current = 'idle'
		setRecordPhase('idle')
		setRecordMs(0)
		stopWaveLoop()

		await new Promise<void>((resolve) => {
			rec.onstop = () => resolve()
			try {
				rec.stop()
			} catch {
				resolve()
			}
		})

		const blob = new Blob(chunksRef.current, { type: mimeRef.current || 'audio/webm' })
		stopStreams()
		resetRecordingState()

		if (durationSec < 0.55) {
			toast.message('Grabá al menos medio segundo de audio')
			return
		}

		try {
			await onSendVoice(blob, durationSec)
		} catch {
			toast.error('No se pudo enviar el audio')
		}
	}, [cancelRecording, onSendVoice, resetRecordingState, stopStreams, stopWaveLoop])

	const startRecording = useCallback(async () => {
		if (disabled || sending || value.trim().length > 0) return
		if (!navigator.mediaDevices?.getUserMedia) {
			toast.error('Tu navegador no permite grabar audio')
			return
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			streamRef.current = stream

			const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
			if (Ctx) {
				const ctx = new Ctx()
				if (ctx.state === 'suspended') {
					await ctx.resume()
				}
				const source = ctx.createMediaStreamSource(stream)
				const analyser = ctx.createAnalyser()
				analyser.fftSize = 256
				analyser.smoothingTimeConstant = 0.28
				source.connect(analyser)
				audioCtxRef.current = ctx
				analyserRef.current = analyser
			}

			const mime = pickRecorderMime()
			const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
			mimeRef.current = rec.mimeType || 'audio/webm'
			chunksRef.current = []
			rec.ondataavailable = (e) => {
				if (e.data.size) chunksRef.current.push(e.data)
			}
			rec.start(250)
			recorderRef.current = rec

			elapsedMsRef.current = 0
			segmentStartRef.current = Date.now()
			phaseRef.current = 'recording'
			setRecordMs(0)
			setRecordPhase('recording')

			tickRef.current = setInterval(() => {
				setRecordMs(getElapsedMs())
			}, 200)

			startWaveLoop()
		} catch {
			toast.error('No se pudo acceder al micrófono')
			cancelRecording()
		}
	}, [cancelRecording, disabled, getElapsedMs, sending, startWaveLoop, value])

	useEffect(() => () => cancelRecording(), [cancelRecording])

	const handleImageFile = useCallback(
		async (file: File | undefined) => {
			if (!file || !onSendImage) return
			if (!file.type.startsWith('image/')) {
				toast.error('Elegí un archivo de imagen')
				return
			}
			try {
				await onSendImage(file)
			} catch {
				toast.error('No se pudo enviar la foto')
			}
		},
		[onSendImage]
	)

	const iconBtnClass =
		'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:text-[#8696A0] dark:hover:bg-white/10'

	const canSendText = value.trim().length > 0 && !sending && !disabled
	const keyboardOverlapPx = useVisualViewportKeyboardOverlap()
	const busy = !!disabled || sending
	const showAttachments = Boolean(onSendImage)
	const isRecordingUi = recordPhase !== 'idle'

	return (
		<div
			className="shrink-0 bg-[#f0f2f5] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:bg-[#202C33]"
			style={keyboardOverlapPx > 0 ? { transform: `translateY(-${keyboardOverlapPx}px)` } : undefined}
		>
			<input
				ref={galleryInputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp,image/gif"
				className="hidden"
				onChange={(e) => {
					const f = e.target.files?.[0]
					void handleImageFile(f)
					e.target.value = ''
				}}
			/>
			<input
				ref={cameraInputRef}
				type="file"
				accept="image/*"
				capture="environment"
				className="hidden"
				onChange={(e) => {
					const f = e.target.files?.[0]
					void handleImageFile(f)
					e.target.value = ''
				}}
			/>

			{isRecordingUi ? (
				<div className="overflow-hidden rounded-2xl bg-white px-3 py-3 text-slate-900 shadow-md ring-1 ring-slate-200/90 dark:bg-[#111B21] dark:text-[#E9EDEF] dark:ring-white/5">
					<div className="flex items-center gap-2">
						<span className="shrink-0 tabular-nums text-sm font-medium text-slate-900 dark:text-white">
							{formatMmSs(recordMs)}
						</span>
						<RecordingWaveform levels={waveLevels} paused={recordPhase === 'paused'} />
					</div>
					<div className="mt-4 flex items-center justify-between px-1">
						<button
							type="button"
							className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-[#8696A0] dark:hover:bg-white/10"
							onClick={cancelRecording}
							aria-label="Descartar audio"
						>
							<Trash2 className="h-6 w-6" strokeWidth={1.75} />
						</button>
						<button
							type="button"
							className="flex h-12 w-12 items-center justify-center rounded-full text-[#EA0038] transition-transform active:scale-95"
							onClick={togglePause}
							aria-label={recordPhase === 'paused' ? 'Reanudar grabación' : 'Pausar grabación'}
						>
							{recordPhase === 'paused' ? (
								<Play className="h-7 w-7 fill-current" />
							) : (
								<Pause className="h-7 w-7 fill-current" />
							)}
						</button>
						<button
							type="button"
							disabled={sending}
							className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#00A884] text-white shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 dark:bg-white dark:text-[#111B21]"
							onClick={() => void sendRecording()}
							aria-label="Enviar audio"
						>
							<Send className="h-6 w-6 -translate-x-px translate-y-px" strokeWidth={2} />
						</button>
					</div>
				</div>
			) : (
				<form
					className="flex items-end gap-2"
					onSubmit={(e) => {
						e.preventDefault()
						if (canSendText) onSubmitText()
					}}
				>
					<div
						className={cn(
							'flex min-h-[48px] min-w-0 flex-1 items-center gap-1 rounded-full border px-1.5 py-1',
							'border-slate-200/95 bg-white shadow-sm dark:border-transparent dark:bg-[#2A3942]'
						)}
					>
						<Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
							<PopoverTrigger asChild>
								<button type="button" disabled={busy} className={iconBtnClass} aria-label="Emojis">
									<Smile className="h-[22px] w-[22px]" strokeWidth={1.75} />
								</button>
							</PopoverTrigger>
							<PopoverContent
								side="top"
								align="start"
								className="w-auto border border-slate-200 bg-white p-2 shadow-lg dark:border-[#2A3942] dark:bg-[#2A3942]"
							>
								<div className="grid max-w-[220px] grid-cols-5 gap-1">
									{QUICK_EMOJIS.map((emoji) => (
										<button
											key={emoji}
											type="button"
											className="flex h-9 w-9 items-center justify-center rounded-md text-lg hover:bg-slate-100 dark:hover:bg-white/10"
											onClick={() => {
												onChange(value + emoji)
												setEmojiOpen(false)
											}}
										>
											{emoji}
										</button>
									))}
								</div>
							</PopoverContent>
						</Popover>

						<label htmlFor="wa-chat-input" className="sr-only">
							Mensaje
						</label>
						<textarea
							id="wa-chat-input"
							rows={1}
							value={value}
							disabled={busy}
							onChange={(e) => onChange(e.target.value)}
							placeholder="Mensaje"
							className="max-h-32 min-h-[30px] min-w-0 flex-1 resize-none bg-transparent py-2 text-[15px] text-slate-900 outline-none placeholder:text-slate-500 dark:text-[#E9EDEF] dark:placeholder:text-[#8696A0]"
						/>

						{showAttachments ? (
							<div className="flex shrink-0 items-center gap-0">
								<button
									type="button"
									disabled={busy}
									className={iconBtnClass}
									aria-label="Galería"
									onClick={() => galleryInputRef.current?.click()}
								>
									<Paperclip className="h-[22px] w-[22px]" strokeWidth={1.75} />
								</button>
								<button
									type="button"
									disabled={busy}
									className={iconBtnClass}
									aria-label="Cámara"
									onClick={() => cameraInputRef.current?.click()}
								>
									<Camera className="h-[22px] w-[22px]" strokeWidth={1.75} />
								</button>
							</div>
						) : null}
					</div>

					{canSendText ? (
						<button
							type="submit"
							disabled={!canSendText}
							className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:h-[52px] sm:w-[52px]"
							aria-label="Enviar mensaje"
						>
							<ArrowUp className="h-6 w-6 stroke-[2.5]" />
						</button>
					) : (
						<button
							type="button"
							disabled={busy}
							onClick={() => void startRecording()}
							className={cn(
								'flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:h-[52px] sm:w-[52px]',
								'bg-[#00A884] text-white dark:bg-white dark:text-[#111827] dark:shadow-lg dark:ring-1 dark:ring-white/20'
							)}
							aria-label="Grabar mensaje de voz"
						>
							<Mic className="h-6 w-6" />
						</button>
					)}
				</form>
			)}
		</div>
	)
}
