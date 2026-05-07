'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Camera, Mic, Paperclip, Smile, X } from 'lucide-react'
import { cn } from '@/app/components/ui/utils'
import { toast } from 'sonner'
import { useVisualViewportKeyboardOverlap } from '@/hooks/useVisualViewportKeyboardOverlap'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover'

const QUICK_EMOJIS = ['😀', '😂', '❤️', '👍', '🔥', '😊', '🙏', '👏', '😮', '😢', '🎉', '✨', '👋', '💬', '📷']

function pickRecorderMime(): string {
	if (typeof MediaRecorder === 'undefined') return ''
	if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
	if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
	return ''
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
	/** Galería / cámara: sube la imagen al chat */
	onSendImage?: (file: File) => Promise<void>
}) {
	const [isRecording, setIsRecording] = useState(false)
	const [recordSeconds, setRecordSeconds] = useState(0)
	const [emojiOpen, setEmojiOpen] = useState(false)
	const recorderRef = useRef<MediaRecorder | null>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const chunksRef = useRef<BlobPart[]>([])
	const mimeRef = useRef('')
	const startedAtRef = useRef(0)
	const isRecordingRef = useRef(false)
	const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const galleryInputRef = useRef<HTMLInputElement | null>(null)
	const cameraInputRef = useRef<HTMLInputElement | null>(null)

	const stopStreams = useCallback(() => {
		streamRef.current?.getTracks().forEach((t) => t.stop())
		streamRef.current = null
		recorderRef.current = null
		chunksRef.current = []
		if (tickRef.current) {
			clearInterval(tickRef.current)
			tickRef.current = null
		}
	}, [])

	const cancelRecording = useCallback(() => {
		const rec = recorderRef.current
		if (rec && rec.state !== 'inactive') {
			rec.onstop = null
			rec.stop()
		}
		stopStreams()
		isRecordingRef.current = false
		setIsRecording(false)
		setRecordSeconds(0)
	}, [stopStreams])

	const finalizeRecording = useCallback(async () => {
		if (!isRecordingRef.current) return
		const rec = recorderRef.current
		if (!rec || rec.state === 'inactive') {
			cancelRecording()
			return
		}

		if (tickRef.current) {
			clearInterval(tickRef.current)
			tickRef.current = null
		}

		const durationSec = (Date.now() - startedAtRef.current) / 1000
		isRecordingRef.current = false
		setIsRecording(false)
		setRecordSeconds(0)

		await new Promise<void>((resolve) => {
			rec.onstop = () => resolve()
			rec.stop()
		})

		const blob = new Blob(chunksRef.current, { type: mimeRef.current || 'audio/webm' })
		stopStreams()

		if (durationSec < 0.55) {
			toast.message('Mantené pulsado un poco más para grabar')
			return
		}

		try {
			await onSendVoice(blob, durationSec)
		} catch {
			toast.error('No se pudo enviar el audio')
		}
	}, [cancelRecording, onSendVoice, stopStreams])

	useEffect(() => {
		if (!isRecording) return
		const onWinUp = () => {
			void finalizeRecording()
		}
		window.addEventListener('pointerup', onWinUp)
		window.addEventListener('pointercancel', onWinUp)
		return () => {
			window.removeEventListener('pointerup', onWinUp)
			window.removeEventListener('pointercancel', onWinUp)
		}
	}, [isRecording, finalizeRecording])

	const startRecording = useCallback(async () => {
		if (disabled || sending || value.trim().length > 0) return
		if (!navigator.mediaDevices?.getUserMedia) {
			toast.error('Tu navegador no permite grabar audio')
			return
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			streamRef.current = stream
			const mime = pickRecorderMime()
			const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
			mimeRef.current = rec.mimeType || 'audio/webm'
			chunksRef.current = []
			rec.ondataavailable = (e) => {
				if (e.data.size) chunksRef.current.push(e.data)
			}
			rec.start()
			recorderRef.current = rec
			startedAtRef.current = Date.now()
			isRecordingRef.current = true
			setRecordSeconds(0)
			setIsRecording(true)
			tickRef.current = setInterval(() => {
				setRecordSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
			}, 500)
		} catch {
			toast.error('No se pudo acceder al micrófono')
		}
	}, [disabled, sending, value])

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

	return (
		<div
			className="shrink-0 bg-[#f0f2f5] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:bg-[#202C33]"
			style={
				keyboardOverlapPx > 0 ? { transform: `translateY(-${keyboardOverlapPx}px)` } : undefined
			}
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

			{isRecording ? (
				<div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 dark:border-transparent dark:bg-[#2A3942]">
					<button
						type="button"
						className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-[#313D43] dark:text-[#E9EDEF] dark:hover:bg-[#3d4a52]"
						onClick={(e) => {
							e.stopPropagation()
							cancelRecording()
						}}
						aria-label="Cancelar grabación"
					>
						<X className="h-5 w-5" />
					</button>
					<div className="min-w-0 flex-1 text-center">
						<p className="text-xs font-medium text-slate-900 dark:text-[#E9EDEF]">Grabando…</p>
						<p className="text-[11px] text-slate-600 dark:text-[#8696A0]">Soltá para enviar</p>
					</div>
					<span className="shrink-0 tabular-nums text-sm text-[#00A884]">{recordSeconds}s</span>
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
								<button
									type="button"
									disabled={busy}
									className={iconBtnClass}
									aria-label="Emojis"
								>
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
							onPointerDown={(e) => {
								e.preventDefault()
								void startRecording()
							}}
							className={cn(
								'flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 sm:h-[52px] sm:w-[52px]',
								'bg-[#00A884] text-white dark:bg-white dark:text-[#111827] dark:shadow-lg dark:ring-1 dark:ring-white/20'
							)}
							aria-label="Mantener pulsado para grabar voz"
						>
							<Mic className="h-6 w-6" />
						</button>
					)}
				</form>
			)}
		</div>
	)
}
