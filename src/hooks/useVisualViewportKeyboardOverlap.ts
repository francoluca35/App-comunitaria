'use client'

import { useEffect, useState } from 'react'

/**
 * Pixels de la parte inferior del layout viewport tapados por el teclado virtual
 * (layout viewport no encoge pero el visual viewport sí). Solo en ventanas ≤1023px.
 */
export function useVisualViewportKeyboardOverlap(): number {
	const [overlap, setOverlap] = useState(0)

	useEffect(() => {
		const vv = window.visualViewport
		if (!vv) return

		const narrowMq = window.matchMedia('(max-width: 1023px)')

		const update = () => {
			if (!narrowMq.matches) {
				setOverlap(0)
				return
			}
			const o = Math.max(0, window.innerHeight - vv.offsetTop - vv.height)
			setOverlap(Math.round(o))
		}

		update()
		vv.addEventListener('resize', update)
		vv.addEventListener('scroll', update)
		window.addEventListener('resize', update)
		narrowMq.addEventListener('change', update)

		return () => {
			vv.removeEventListener('resize', update)
			vv.removeEventListener('scroll', update)
			window.removeEventListener('resize', update)
			narrowMq.removeEventListener('change', update)
		}
	}, [])

	return overlap
}
