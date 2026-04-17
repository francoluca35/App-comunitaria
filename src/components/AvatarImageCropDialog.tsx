'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'

const VIEWPORT_PX = 280
const OUTPUT_PX = 512
/** Un poco más que “cover” para que ambos lados superen el viewport y se pueda panear en X e Y (p. ej. selfies verticales). */
const COVER_SLACK = 1.14

function clampPan(pan: number, viewport: number, displaySize: number) {
	if (displaySize <= viewport + 0.5) return (viewport - displaySize) / 2
	return Math.min(0, Math.max(viewport - displaySize, pan))
}

export type AvatarImageCropDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	file: File | null
	onConfirm: (croppedFile: File) => Promise<void> | void
	title?: string
	description?: string
}

export function AvatarImageCropDialog({
	open,
	onOpenChange,
	file,
	onConfirm,
	title = 'Ajustá tu foto',
	description = 'Arrastrá la imagen hacia los lados o arriba y abajo para encuadrarla. Se guarda un recorte cuadrado.',
}: AvatarImageCropDialogProps) {
	const [objectUrl, setObjectUrl] = useState<string | null>(null)
	const [naturalW, setNaturalW] = useState(0)
	const [naturalH, setNaturalH] = useState(0)
	const [baseScale, setBaseScale] = useState(1)
	const [panX, setPanX] = useState(0)
	const [panY, setPanY] = useState(0)
	const [saving, setSaving] = useState(false)
	const imgRef = useRef<HTMLImageElement | null>(null)
	const dragRef = useRef<{ active: boolean; startX: number; startY: number; origPanX: number; origPanY: number }>({
		active: false,
		startX: 0,
		startY: 0,
		origPanX: 0,
		origPanY: 0,
	})

	const resetFromImage = useCallback((nw: number, nh: number) => {
		if (!nw || !nh) return
		const base = Math.max(VIEWPORT_PX / nw, VIEWPORT_PX / nh) * COVER_SLACK
		setBaseScale(base)
		const iw = nw * base
		const ih = nh * base
		setPanX((VIEWPORT_PX - iw) / 2)
		setPanY((VIEWPORT_PX - ih) / 2)
	}, [])

	useEffect(() => {
		if (!open || !file) {
			setObjectUrl((prev) => {
				if (prev) URL.revokeObjectURL(prev)
				return null
			})
			setNaturalW(0)
			setNaturalH(0)
			return
		}
		const url = URL.createObjectURL(file)
		setObjectUrl(url)
		return () => {
			URL.revokeObjectURL(url)
		}
	}, [open, file])

	const handleImgLoad = useCallback(() => {
		const el = imgRef.current
		if (!el) return
		const nw = el.naturalWidth
		const nh = el.naturalHeight
		if (!nw || !nh) return
		setNaturalW(nw)
		setNaturalH(nh)
		resetFromImage(nw, nh)
	}, [resetFromImage])

	const onPointerDown = (e: React.PointerEvent) => {
		if (e.button !== 0) return
		e.currentTarget.setPointerCapture(e.pointerId)
		dragRef.current = {
			active: true,
			startX: e.clientX,
			startY: e.clientY,
			origPanX: panX,
			origPanY: panY,
		}
	}

	const onPointerMove = (e: React.PointerEvent) => {
		if (!dragRef.current.active) return
		const dx = e.clientX - dragRef.current.startX
		const dy = e.clientY - dragRef.current.startY
		const iw = naturalW * baseScale
		const ih = naturalH * baseScale
		setPanX(clampPan(dragRef.current.origPanX + dx, VIEWPORT_PX, iw))
		setPanY(clampPan(dragRef.current.origPanY + dy, VIEWPORT_PX, ih))
	}

	const onPointerUp = (e: React.PointerEvent) => {
		if (dragRef.current.active) {
			try {
				e.currentTarget.releasePointerCapture(e.pointerId)
			} catch {
				// ignore
			}
		}
		dragRef.current.active = false
	}

	const buildCroppedFile = useCallback(async (): Promise<File | null> => {
		const img = imgRef.current
		if (!img || !naturalW || !naturalH || !file) return null
		const iw = naturalW * baseScale
		const ih = naturalH * baseScale
		const leftNat = (-panX / iw) * naturalW
		const topNat = (-panY / ih) * naturalH
		const rightNat = ((VIEWPORT_PX - panX) / iw) * naturalW
		const bottomNat = ((VIEWPORT_PX - panY) / ih) * naturalH
		const sx = Math.max(0, Math.min(leftNat, rightNat))
		const sy = Math.max(0, Math.min(topNat, bottomNat))
		const ex = Math.min(naturalW, Math.max(leftNat, rightNat))
		const ey = Math.min(naturalH, Math.max(topNat, bottomNat))
		const sw = Math.max(1, ex - sx)
		const sh = Math.max(1, ey - sy)

		const canvas = document.createElement('canvas')
		canvas.width = OUTPUT_PX
		canvas.height = OUTPUT_PX
		const ctx = canvas.getContext('2d')
		if (!ctx) return null
		ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_PX, OUTPUT_PX)

		return new Promise((resolve) => {
			canvas.toBlob(
				(blob) => {
					if (!blob) {
						resolve(null)
						return
					}
					const name = file.name.replace(/\.[^.]+$/, '') || 'avatar'
					resolve(new File([blob], `${name}-avatar.jpg`, { type: 'image/jpeg' }))
				},
				'image/jpeg',
				0.92
			)
		})
	}, [file, naturalW, naturalH, baseScale, panX, panY])

	const handleConfirm = async () => {
		const out = await buildCroppedFile()
		if (!out) return
		setSaving(true)
		try {
			await onConfirm(out)
			onOpenChange(false)
		} catch {
			// El padre muestra toasts / errores; el diálogo permanece abierto.
		} finally {
			setSaving(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md border-[#D8D2CC] sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				{objectUrl && file ? (
					<div className="space-y-4">
						<div
							className="relative mx-auto touch-none overflow-hidden rounded-full border-2 border-[#D8D2CC] bg-[#e8e4e0] shadow-inner dark:border-[#3a3b3c] dark:bg-[#2a2b2c]"
							style={{
								width: VIEWPORT_PX,
								height: VIEWPORT_PX,
								touchAction: 'none',
								overscrollBehavior: 'contain',
							}}
							onPointerDown={onPointerDown}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
							onPointerCancel={onPointerUp}
						>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								ref={imgRef}
								src={objectUrl}
								alt=""
								draggable={false}
								onLoad={handleImgLoad}
								className="pointer-events-none absolute select-none"
								style={{
									width: naturalW ? naturalW * baseScale : 'auto',
									height: naturalH ? naturalH * baseScale : 'auto',
									left: panX,
									top: panY,
								}}
							/>
						</div>
					</div>
				) : null}
				<DialogFooter className="flex-col gap-2 sm:flex-col">
					<Button
						type="button"
						className="w-full"
						disabled={saving || !objectUrl}
						style={{ backgroundColor: '#8B0015' }}
						onClick={() => void handleConfirm()}
					>
						{saving ? 'Guardando…' : 'Guardar foto'}
					</Button>
					<Button type="button" variant="outline" className="w-full" disabled={saving} onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
