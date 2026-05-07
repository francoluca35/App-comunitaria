'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Mic, X } from 'lucide-react'
import { cn } from '@/app/components/ui/utils'
import { toast } from 'sonner'
import { useVisualViewportKeyboardOverlap } from '@/hooks/useVisualViewportKeyboardOverlap'

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
}: {
	value: string
	onChange: (v: string) => void
	onSubmitText: () => void
	sending: boolean
	disabled?: boolean
	onSendVoice: (blob: Blob, durationSec: number) => Promise<void>
}) {
	const [isRecording, setIsRecording] = useState(false)
	const [recordSeconds, setRecordSeconds] = useState(0)
	const recorderRef = useRef<MediaRecorder | null>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const chunksRef = useRef<BlobPart[]>([])
	const mimeRef = useRef('')
	const startedAtRef = useRef(0)
	const isRecordingRef = useRef(false)
	const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

	const canSendText = value.trim().length > 0 && !sending && !disabled
	const keyboardOverlapPx = useVisualViewportKeyboardOverlap()

	return (
		<div
			className="shrink-0 bg-[#f0f2f5] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:bg-[#202C33]"
			style={
				keyboardOverlapPx > 0 ? { transform: `translateY(-${keyboardOverlapPx}px)` } : undefined
			}
		>
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
					<div className="min-h-[44px] flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 dark:border-transparent dark:bg-[#2A3942]">
						<label htmlFor="wa-chat-input" className="sr-only">
							Mensaje
						</label>
						<textarea
							id="wa-chat-input"
							rows={1}
							value={value}
							disabled={!!disabled || sending}
							onChange={(e) => onChange(e.target.value)}
							placeholder="Mensaje"
							className="max-h-32 min-h-[28px] w-full resize-none bg-transparent text-[15px] text-slate-900 placeholder:text-slate-500 outline-none dark:text-[#E9EDEF] dark:placeholder:text-[#8696A0]"
						/>
					</div>
					{canSendText ? (
						<button
							type="submit"
							disabled={!canSendText}
							className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
							aria-label="Enviar mensaje"
						>
							<ArrowUp className="h-6 w-6 stroke-[2.5]" />
						</button>
					) : (
						<button
							type="button"
							disabled={!!disabled || sending}
							onPointerDown={(e) => {
								e.preventDefault()
								void startRecording()
							}}
							className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
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
