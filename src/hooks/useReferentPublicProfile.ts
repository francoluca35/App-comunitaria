'use client'

import { useCallback, useEffect, useState } from 'react'

export type ReferentPublicProfile = {
	id: string
	name: string | null
	avatar_url: string | null
}

/** Perfil del referente para el banner (sin depender de sesión ni /chat/support). */
export function useReferentPublicProfile() {
	const [referent, setReferent] = useState<ReferentPublicProfile | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const reload = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/referent/profile')
			if (!res.ok) {
				const j = await res.json().catch(() => ({}))
				setError((j as { error?: string }).error ?? res.statusText)
				setReferent(null)
				return
			}
			const data = (await res.json()) as ReferentPublicProfile
			setReferent(data)
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al cargar')
			setReferent(null)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void reload()
	}, [reload])

	return { referent, loading, error, reload }
}
