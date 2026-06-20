'use client'

import { useEffect, type RefObject } from 'react'

const MIN_VISIBLE_RATIO = 0.5

/**
 * Pausa un video cuando deja de estar suficientemente visible al scrollear (comportamiento tipo Instagram).
 */
export function usePauseVideoOnScrollAway(
	videoRef: RefObject<HTMLVideoElement | null>,
	enabled = true,
	mediaKey?: string
) {
	useEffect(() => {
		if (!enabled) return

		const video = videoRef.current
		if (!video) return

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0]
				if (!entry) return
				if (entry.intersectionRatio < MIN_VISIBLE_RATIO && !video.paused) {
					video.pause()
				}
			},
			{ threshold: [0, 0.25, 0.5, 0.75, 1] }
		)

		observer.observe(video)
		return () => observer.disconnect()
	}, [videoRef, enabled, mediaKey])
}
