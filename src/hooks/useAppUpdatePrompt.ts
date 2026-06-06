'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
	applyAppUpdate,
	CLIENT_APP_VERSION,
	dismissOptionalUpdate,
	isClientVersionOutdated,
	isClientVersionRequiredUpdate,
	readDismissedUpdateVersion,
	type AppVersionInfo,
} from '@/lib/app-version'

type UpdateReason = 'version' | 'service-worker'

export function useAppUpdatePrompt() {
	const [open, setOpen] = useState(false)
	const [required, setRequired] = useState(false)
	const [reason, setReason] = useState<UpdateReason>('version')
	const [serverVersion, setServerVersion] = useState<string | null>(null)
	const checkingRef = useRef(false)

	const showUpdate = useCallback((nextRequired: boolean, nextReason: UpdateReason, nextServerVersion?: string) => {
		setRequired(nextRequired)
		setReason(nextReason)
		if (nextServerVersion) setServerVersion(nextServerVersion)
		setOpen(true)
	}, [])

	const checkServerVersion = useCallback(async () => {
		if (checkingRef.current || process.env.NODE_ENV === 'development') return
		checkingRef.current = true
		try {
			const res = await fetch('/api/app-version', { cache: 'no-store' })
			if (!res.ok) return
			const data = (await res.json()) as AppVersionInfo
			setServerVersion(data.version)
			if (!isClientVersionOutdated(CLIENT_APP_VERSION, data)) return

			const mustUpdate = isClientVersionRequiredUpdate(CLIENT_APP_VERSION, data)
			if (!mustUpdate) {
				const dismissed = readDismissedUpdateVersion()
				if (dismissed === data.version) return
			}

			showUpdate(mustUpdate, 'version', data.version)
		} catch {
			/* noop */
		} finally {
			checkingRef.current = false
		}
	}, [showUpdate])

	useEffect(() => {
		if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

		let cancelled = false

		const watchServiceWorker = async () => {
			try {
				const reg = await navigator.serviceWorker.ready
				if (cancelled) return

				reg.addEventListener('updatefound', () => {
					const worker = reg.installing
					if (!worker) return
					worker.addEventListener('statechange', () => {
						if (worker.state === 'installed' && navigator.serviceWorker.controller) {
							showUpdate(false, 'service-worker')
						}
					})
				})

				await reg.update()
			} catch {
				/* noop */
			}
		}

		void watchServiceWorker()
		void checkServerVersion()

		const onVisible = () => {
			if (document.visibilityState !== 'visible') return
			void checkServerVersion()
			void navigator.serviceWorker.ready.then((reg) => reg.update()).catch(() => {})
		}

		document.addEventListener('visibilitychange', onVisible)
		window.addEventListener('focus', onVisible)

		return () => {
			cancelled = true
			document.removeEventListener('visibilitychange', onVisible)
			window.removeEventListener('focus', onVisible)
		}
	}, [checkServerVersion, showUpdate])

	const confirmUpdate = useCallback(async () => {
		setOpen(false)
		await applyAppUpdate()
	}, [])

	const dismissUpdate = useCallback(() => {
		if (required) return
		if (serverVersion) dismissOptionalUpdate(serverVersion)
		setOpen(false)
	}, [required, serverVersion])

	return {
		open,
		required,
		reason,
		clientVersion: CLIENT_APP_VERSION,
		serverVersion,
		confirmUpdate,
		dismissUpdate,
	}
}
