'use client'

import { useCallback, useEffect, useState } from 'react'

export type ReferentPublicProfile = {
	id: string
	name: string | null
	avatar_url: string | null
}

const CACHE_KEY = 'referent_public_profile_v1'
const TTL_MS = 5 * 60 * 1000

function readCache(): ReferentPublicProfile | null {
	if (typeof sessionStorage === 'undefined') return null
	try {
		const raw = sessionStorage.getItem(CACHE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw) as { at?: number; data?: ReferentPublicProfile }
		if (!parsed.at || !parsed.data || Date.now() - parsed.at > TTL_MS) {
			sessionStorage.removeItem(CACHE_KEY)
			return null
		}
		return parsed.data
	} catch {
		return null
	}
}

function writeCache(data: ReferentPublicProfile) {
	if (typeof sessionStorage === 'undefined') return
	try {
		sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }))
	} catch {
		// ignore
	}
}

/** Perfil del referente para el banner (sin depender de sesión ni /chat/support). */
export function useReferentPublicProfile() {
	const [referent, setReferent] = useState<ReferentPublicProfile | null>(() => readCache())
	const [loading, setLoading] = useState(!readCache())
	const [error, setError] = useState<string | null>(null)

	const reload = useCallback(async () => {
		const cached = readCache()
		if (cached) {
			setReferent(cached)
			setLoading(false)
			return
		}
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
			writeCache(data)
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
