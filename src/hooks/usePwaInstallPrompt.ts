'use client'

import { useCallback, useEffect, useState } from 'react'

/** Evento no estándar de Chromium para instalación PWA. */
export type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function isRunningAsInstalledPwa(): boolean {
	if (typeof window === 'undefined') return false
	try {
		if (window.matchMedia('(display-mode: standalone)').matches) return true
		if (window.matchMedia('(display-mode: fullscreen)').matches) return true
		const nav = window.navigator as Navigator & { standalone?: boolean }
		if (nav.standalone === true) return true
	} catch {
		/* noop */
	}
	return false
}

/**
 * iPhone / iPod / iPad en el navegador (no abierto desde icono de inicio).
 * Safari no dispara `beforeinstallprompt`; la instalación es “Añadir a pantalla de inicio”.
 */
export function isLikelyIosBrowserWithoutStandalone(): boolean {
	if (typeof window === 'undefined') return false
	if (isRunningAsInstalledPwa()) return false
	try {
		const ua = window.navigator.userAgent || ''
		if (/iPhone|iPod/.test(ua)) return true
		if (/iPad/.test(ua)) return true
		const platform = window.navigator.platform || ''
		const maxTouch = window.navigator.maxTouchPoints ?? 0
		if (platform === 'MacIntel' && maxTouch > 1) return true
	} catch {
		/* noop */
	}
	return false
}

/**
 * Ofrece instalación PWA cuando el navegador la permite (`beforeinstallprompt`).
 * Si ya se abre como app instalada (standalone / iOS), no se ofrece.
 *
 * En iOS (Safari / Chrome en iPhone, etc.) ofrece `canOfferIosInstallHint` cuando no hay
 * prompt nativo y el usuario no está ya en la app instalada.
 */
export function usePwaInstallPrompt() {
	const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
	const [installed, setInstalled] = useState(false)
	const [iosEligible, setIosEligible] = useState(false)

	useEffect(() => {
		if (typeof window === 'undefined') return
		setIosEligible(isLikelyIosBrowserWithoutStandalone())
	}, [])

	useEffect(() => {
		if (typeof window === 'undefined') return
		if (isRunningAsInstalledPwa()) return

		const onBeforeInstallPrompt = (e: Event) => {
			e.preventDefault()
			setDeferred(e as BeforeInstallPromptEvent)
		}
		const onAppInstalled = () => {
			setInstalled(true)
			setDeferred(null)
		}

		window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
		window.addEventListener('appinstalled', onAppInstalled)
		return () => {
			window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
			window.removeEventListener('appinstalled', onAppInstalled)
		}
	}, [])

	const install = useCallback(async () => {
		if (!deferred) return
		try {
			await deferred.prompt()
			await deferred.userChoice
		} finally {
			setDeferred(null)
		}
	}, [deferred])

	const canOfferInstall =
		!isRunningAsInstalledPwa() && !installed && deferred !== null

	const canOfferIosInstallHint =
		iosEligible && !installed && deferred === null && !isRunningAsInstalledPwa()

	return { canOfferInstall, canOfferIosInstallHint, install }
}
