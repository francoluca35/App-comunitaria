'use client'

import { Pause, Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/app/components/ui/utils'

function formatMmSs(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
	const m = Math.floor(seconds / 60)
	const s = Math.floor(seconds % 60)
	return `${m}:${s.toString().padStart(2, '0')}`
}

export function VoiceMessageRow({
	src,
	isMine,
	initialDurationSec,
}: {
	src: string
	isMine: boolean
	initialDurationSec?: number
}) {
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const [playing, setPlaying] = useState(false)
	const [current, setCurrent] = useState(0)
	const [duration, setDuration] = useState(initialDurationSec ?? 0)

	useEffect(() => {
		const a = audioRef.current
		if (!a) return
		const onMeta = () => {
			const d = a.duration
			if (Number.isFinite(d) && d > 0) setDuration(d)
		}
		const onTime = () => setCurrent(a.currentTime)
		const onEnded = () => {
			setPlaying(false)
			setCurrent(0)
		}
		a.addEventListener('loadedmetadata', onMeta)
		a.addEventListener('timeupdate', onTime)
		a.addEventListener('ended', onEnded)
		return () => {
			a.removeEventListener('loadedmetadata', onMeta)
			a.removeEventListener('timeupdate', onTime)
			a.removeEventListener('ended', onEnded)
		}
	}, [src])

	const toggle = useCallback(() => {
		const a = audioRef.current
		if (!a) return
		if (playing) {
			a.pause()
			setPlaying(false)
		} else {
			void a.play().then(
				() => setPlaying(true),
				() => {
					/* autoplay bloqueado u error */
				}
			)
		}
	}, [playing])

	const progress = duration > 0 ? Math.min(1, current / duration) : 0
	const timeLabel = playing ? formatMmSs(current) : formatMmSs(duration)

	return (
		<div className="flex min-w-[200px] max-w-[280px] items-center gap-2 py-0.5">
			<audio ref={audioRef} src={src} preload="metadata" className="hidden" />
			<button
				type="button"
				onClick={toggle}
				className={cn(
					'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90',
					isMine
						? 'bg-emerald-700 text-white dark:bg-[#054D3D] dark:text-[#E9EDEF]'
						: 'bg-slate-200 text-slate-800 dark:bg-[#313D43] dark:text-[#E9EDEF]'
				)}
				aria-label={playing ? 'Pausar' : 'Reproducir'}
			>
				{playing ? (
					<Pause className="h-4 w-4" />
				) : (
					<Play className="ml-0.5 h-4 w-4" />
				)}
			</button>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div
					className={cn('flex h-7 items-end gap-px', isMine ? 'opacity-95' : 'opacity-85')}
					aria-hidden
				>
					{Array.from({ length: 20 }).map((_, i) => (
						<span
							key={i}
							className={cn(
								'w-0.5 rounded-full bg-slate-500/50 dark:bg-[#8696A0]',
								isMine && 'bg-emerald-800/40 dark:bg-[#86CFB7]/80'
							)}
							style={{ height: `${6 + ((i * 11) % 14)}px` }}
						/>
					))}
				</div>
				<div className="h-0.5 w-full overflow-hidden rounded-full bg-slate-400/30 dark:bg-black/25">
					<div
						className="h-full bg-[#00A884] transition-[width] duration-150"
						style={{ width: `${progress * 100}%` }}
					/>
				</div>
			</div>
			<span className="shrink-0 text-[11px] tabular-nums text-slate-600 dark:text-[#8696A0]">{timeLabel}</span>
		</div>
	)
}
