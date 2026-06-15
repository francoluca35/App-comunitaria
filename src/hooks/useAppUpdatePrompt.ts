'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
	applyAppUpdate,
	CLIENT_APP_VERSION,
	dismissOptionalUpdateDialog,
	isChunkLoadError,
	isClientVersionOutdated,
	isClientVersionRequiredUpdate,
	isOptionalUpdateDialogSnoozed,
	tryAutoReloadAfterChunkError,
	UPDATE_CHECK_DEBOUNCE_MS,
	type AppVersionInfo,
} from '@/lib/app-version'

type UpdateReason = 'version' | 'service-worker'

/**
 * Consulta en segundo plano si hay versión nueva. No recarga la página ni muestra UI
 * hasta detectar una actualización pendiente.
 */
export function useAppUpdatePrompt() {
	const [dialogOpen, setDialogOpen] = useState(false)
	const [required, setRequired] = useState(false)
	const [reason, setReason] = useState<UpdateReason>('version')
	const [serverVersion, setServerVersion] = useState<string | null>(null)
	const [isUpdating, setIsUpdating] = useState(false)

	const checkingRef = useRef(false)
	const lastCheckAtRef = useRef(0)
	const pendingRef = useRef(false)

	const offerUpdateDialog = useCallback(
		(nextRequired: boolean, nextReason: UpdateReason, nextServerVersion: string) => {
			if (pendingRef.current) return
			if (!nextRequired && isOptionalUpdateDialogSnoozed(nextServerVersion)) return

			pendingRef.current = true
			setRequired(nextRequired)
			setReason(nextReason)
			setServerVersion(nextServerVersion)
			setDialogOpen(true)
		},
		[]
	)

	const checkServerVersion = useCallback(async () => {
		if (checkingRef.current || process.env.NODE_ENV === 'development') return
		checkingRef.current = true
		try {
			const res = await fetch('/api/app-version', { cache: 'no-store', credentials: 'same-origin' })
			if (!res.ok) return
			const data = (await res.json()) as AppVersionInfo
			if (!isClientVersionOutdated(CLIENT_APP_VERSION, data)) return

			const mustUpdate = isClientVersionRequiredUpdate(CLIENT_APP_VERSION, data)
			offerUpdateDialog(mustUpdate, 'version', data.version)
		} catch {
			/* consulta silenciosa */
		} finally {
			checkingRef.current = false
			lastCheckAtRef.current = Date.now()
		}
	}, [offerUpdateDialog])

	const runDebouncedCheck = useCallback(() => {
		const elapsed = Date.now() - lastCheckAtRef.current
		if (elapsed < UPDATE_CHECK_DEBOUNCE_MS) return
		void checkServerVersion()
	}, [checkServerVersion])

	useEffect(() => {
		if (typeof window === 'undefined') return

		void checkServerVersion()

		const onVisible = () => {
			if (document.visibilityState !== 'visible') return
			runDebouncedCheck()
		}

		document.addEventListener('visibilitychange', onVisible)
		return () => document.removeEventListener('visibilitychange', onVisible)
	}, [checkServerVersion, runDebouncedCheck])

	useEffect(() => {
		if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

		const onControllerChange = () => {
			/* No recargar automáticamente: el usuario elige cuándo actualizar. */
		}

		navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

		let cancelled = false
		void navigator.serviceWorker.ready.then((reg) => {
			if (cancelled) return
			reg.addEventListener('updatefound', () => {
				const worker = reg.installing
				if (!worker) return
				worker.addEventListener('statechange', () => {
					if (worker.state !== 'installed' || !navigator.serviceWorker.controller) return
					offerUpdateDialog(false, 'service-worker', serverVersion ?? CLIENT_APP_VERSION)
				})
			})
		})

		return () => {
			cancelled = true
			navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
		}
	}, [offerUpdateDialog, serverVersion])

	useEffect(() => {
		if (typeof window === 'undefined') return

		const handleChunkFailure = (reason: unknown) => {
			if (!isChunkLoadError(reason)) return
			if (tryAutoReloadAfterChunkError()) return
			offerUpdateDialog(true, 'version', serverVersion ?? CLIENT_APP_VERSION)
		}

		const onError = (event: ErrorEvent) => {
			handleChunkFailure(event.error ?? event.message)
		}
		const onRejection = (event: PromiseRejectionEvent) => {
			handleChunkFailure(event.reason)
		}

		window.addEventListener('error', onError)
		window.addEventListener('unhandledrejection', onRejection)
		return () => {
			window.removeEventListener('error', onError)
			window.removeEventListener('unhandledrejection', onRejection)
		}
	}, [offerUpdateDialog, serverVersion])

	const confirmUpdate = useCallback(async () => {
		setIsUpdating(true)
		setDialogOpen(false)
		await applyAppUpdate()
	}, [])

	const dismissDialog = useCallback(() => {
		if (required) return
		if (serverVersion) dismissOptionalUpdateDialog(serverVersion)
		pendingRef.current = false
		setDialogOpen(false)
	}, [required, serverVersion])

	return {
		dialogOpen,
		required,
		reason,
		isUpdating,
		clientVersion: CLIENT_APP_VERSION,
		serverVersion,
		confirmUpdate,
		dismissDialog,
	}
}
