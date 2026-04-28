'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { ArrowLeft, LayoutGrid, PenLine } from 'lucide-react'
import { CST } from '@/lib/cst-theme'
import { POST_MEDIA_LIMITS } from '@/lib/post-media-limits'

type DrawFn = (ctx: CanvasRenderingContext2D, t: number) => void
type PrimaryCard = {
	id: string
	title: string
	desc: string
	badge: string
	badgeBg: string
	badgeColor: string
	bg: string
	draw: DrawFn
	size: number
	targetHref: string
}
type SecondaryCard = {
	id: string
	title: string
	desc: string
	draw: DrawFn
	size: number
	targetHref: string
}

function useAnimatedCanvas(drawFn: DrawFn) {
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return
		const context = ctx

		let rafId = 0
		let start: number | null = null

		function loop(ts: number) {
			if (!start) start = ts
			const t = (ts - start) / 1000
			drawFn(context, t)
			rafId = requestAnimationFrame(loop)
		}

		rafId = requestAnimationFrame(loop)
		return () => cancelAnimationFrame(rafId)
	}, [drawFn])

	return canvasRef
}

function circ(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
	ctx.beginPath()
	ctx.arc(x, y, r, 0, Math.PI * 2)
	ctx.fill()
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	const rr = Math.min(r, w / 2, h / 2)
	ctx.beginPath()
	ctx.moveTo(x + rr, y)
	ctx.arcTo(x + w, y, x + w, y + h, rr)
	ctx.arcTo(x + w, y + h, x, y + h, rr)
	ctx.arcTo(x, y + h, x, y, rr)
	ctx.arcTo(x, y, x + w, y, rr)
	ctx.closePath()
}

const drawMissing: DrawFn = (ctx, t) => {
	ctx.clearRect(0, 0, 72, 72)

	ctx.fillStyle = 'rgba(200,80,80,0.12)'
	ctx.fillRect(0, 56, 72, 16)

	ctx.fillStyle = 'rgba(0,0,0,0.25)'
	ctx.beginPath()
	ctx.ellipse(30, 57, 12, 3, 0, 0, Math.PI * 2)
	ctx.fill()

	const lean = Math.sin(t * 4) * 2
	const legSwing = Math.sin(t * 4)
	ctx.save()
	ctx.translate(lean * 0.3, 0)

	ctx.fillStyle = '#c8a040'
	ctx.save()
	ctx.translate(26, 46)
	ctx.rotate(legSwing * 0.3)
	ctx.fillRect(-3, 0, 6, 14)
	ctx.fillStyle = '#5a3010'
	ctx.fillRect(-3, 11, 8, 4)
	ctx.restore()

	ctx.fillStyle = '#c8a040'
	ctx.save()
	ctx.translate(34, 46)
	ctx.rotate(-legSwing * 0.3)
	ctx.fillRect(-3, 0, 6, 14)
	ctx.fillStyle = '#5a3010'
	ctx.fillRect(-4, 11, 8, 4)
	ctx.restore()

	ctx.fillStyle = '#8a6030'
	ctx.fillRect(20, 28, 20, 22)
	ctx.fillStyle = '#6a4820'
	ctx.fillRect(20, 28, 6, 10)
	ctx.fillRect(34, 28, 6, 10)
	ctx.fillStyle = '#4a3010'
	ctx.fillRect(20, 44, 20, 3)
	ctx.fillStyle = '#c8a820'
	ctx.fillRect(28, 43, 6, 5)

	const armAngle = Math.sin(t * 2) * 0.4 - 0.3
	ctx.save()
	ctx.translate(20, 32)
	ctx.rotate(armAngle)
	ctx.fillStyle = '#c8a040'
	ctx.fillRect(-10, 0, 6, 14)
	ctx.fillStyle = '#f0c080'
	circ(ctx, -7, 15, 3)
	ctx.strokeStyle = '#888'
	ctx.lineWidth = 2
	ctx.beginPath()
	ctx.moveTo(-7, 18)
	ctx.lineTo(-2, 26)
	ctx.stroke()
	ctx.strokeStyle = 'rgba(180,220,255,0.9)'
	ctx.lineWidth = 2.5
	ctx.beginPath()
	ctx.arc(-7, 15, 7, 0, Math.PI * 2)
	ctx.stroke()
	ctx.fillStyle = 'rgba(200,230,255,0.3)'
	ctx.beginPath()
	ctx.arc(-7, 15, 5, 0, Math.PI * 2)
	ctx.fill()
	ctx.restore()

	ctx.fillStyle = '#c8a040'
	ctx.fillRect(40, 30, 6, 14)
	ctx.fillStyle = '#f0c080'
	circ(ctx, 43, 45, 3)

	ctx.fillStyle = '#f0c080'
	circ(ctx, 30, 20, 10)
	ctx.fillStyle = '#3a2810'
	ctx.fillRect(18, 12, 24, 4)
	ctx.fillRect(22, 6, 16, 8)

	const eyeX = Math.sin(t * 3) * 2
	ctx.fillStyle = '#1a0a00'
	circ(ctx, 27 + eyeX, 20, 1.5)
	circ(ctx, 33 + eyeX, 20, 1.5)

	ctx.strokeStyle = '#8a4020'
	ctx.lineWidth = 1.2
	ctx.beginPath()
	ctx.moveTo(27, 25)
	ctx.lineTo(33, 25)
	ctx.stroke()
	ctx.restore()

	for (let i = 0; i < 3; i++) {
		const qx = 52 + Math.sin(t * 1.5 + i * 2) * 5
		const qy = 12 + i * 14 + Math.sin(t * 2 + i) * 3
		const alpha = 0.3 + Math.abs(Math.sin(t + i)) * 0.5
		ctx.fillStyle = `rgba(255,120,120,${alpha})`
		ctx.font = `bold ${10 + i * 2}px sans-serif`
		ctx.textAlign = 'left'
		ctx.fillText('?', qx, qy)
	}
}

const drawAlert: DrawFn = (ctx, t) => {
	ctx.clearRect(0, 0, 72, 72)
	for (let i = 0; i < 3; i++) {
		const phase = ((t * 1.5 + i * 0.6) % 1.8) / 1.8
		const r = 4 + phase * 28
		const alpha = (1 - phase) * 0.5
		ctx.strokeStyle = `rgba(255,120,40,${alpha})`
		ctx.lineWidth = 1.5
		ctx.beginPath()
		ctx.arc(22, 38, r, 0, Math.PI * 2)
		ctx.stroke()
	}

	const bounce = Math.sin(t * 5) * 1.5
	ctx.save()
	ctx.translate(0, bounce)
	const ls = Math.sin(t * 4)

	ctx.fillStyle = '#1a3a6a'
	ctx.save()
	ctx.translate(22, 50)
	ctx.rotate(ls * 0.2)
	ctx.fillRect(-4, 0, 8, 14)
	ctx.fillStyle = '#0a1a3a'
	ctx.fillRect(-4, 12, 9, 4)
	ctx.restore()

	ctx.fillStyle = '#1a3a6a'
	ctx.save()
	ctx.translate(30, 50)
	ctx.rotate(-ls * 0.2)
	ctx.fillRect(-4, 0, 8, 14)
	ctx.fillStyle = '#0a1a3a'
	ctx.fillRect(-5, 12, 9, 4)
	ctx.restore()

	ctx.fillStyle = '#e8b020'
	ctx.fillRect(16, 28, 24, 24)
	ctx.fillStyle = 'rgba(255,255,255,0.3)'
	ctx.fillRect(16, 44, 24, 3)

	ctx.fillStyle = '#e8b020'
	ctx.save()
	ctx.translate(16, 30)
	ctx.rotate(-0.8 + Math.sin(t * 2) * 0.1)
	ctx.fillRect(-10, 0, 8, 14)
	ctx.restore()

	ctx.save()
	ctx.translate(2, 32)
	ctx.rotate(-0.3 + Math.sin(t * 2) * 0.05)
	ctx.fillStyle = '#e02020'
	ctx.beginPath()
	ctx.moveTo(0, 4)
	ctx.lineTo(16, 0)
	ctx.lineTo(16, 10)
	ctx.lineTo(0, 8)
	ctx.closePath()
	ctx.fill()
	ctx.fillStyle = '#c01010'
	circ(ctx, 0, 6, 4)
	const wav = Math.sin(t * 6)
	if (wav > 0) {
		ctx.strokeStyle = `rgba(255,200,50,${wav})`
		ctx.lineWidth = 1
		for (let w = 0; w < 3; w++) {
			ctx.beginPath()
			ctx.arc(-4, 6, 6 + w * 4, -0.8, 0.8)
			ctx.stroke()
		}
	}
	ctx.restore()

	ctx.fillStyle = '#e8b020'
	ctx.fillRect(40, 30, 8, 14)
	ctx.fillStyle = '#f0c080'
	circ(ctx, 44, 45, 3)
	circ(ctx, 26, 20, 11)

	ctx.fillStyle = '#d01010'
	ctx.beginPath()
	ctx.arc(26, 16, 11, Math.PI, 0)
	ctx.fill()
	ctx.fillRect(13, 17, 26, 4)
	ctx.fillStyle = 'rgba(100,180,255,0.5)'
	ctx.fillRect(17, 17, 18, 4)
	ctx.fillStyle = '#ff3030'
	ctx.fillRect(20, 17, 12, 3)

	ctx.fillStyle = '#1a0800'
	circ(ctx, 22, 21, 1.8)
	circ(ctx, 30, 21, 1.8)
	ctx.fillStyle = '#8a2000'
	ctx.beginPath()
	ctx.arc(26, 26, 3.5, 0, Math.PI)
	ctx.fill()
	ctx.restore()
}

const drawPet: DrawFn = (ctx, t) => {
	ctx.clearRect(0, 0, 72, 72)
	ctx.fillStyle = 'rgba(180,120,40,0.12)'
	ctx.fillRect(0, 56, 72, 16)
	ctx.fillStyle = 'rgba(0,0,0,0.25)'
	ctx.beginPath()
	ctx.ellipse(36, 58, 18, 4, 0, 0, Math.PI * 2)
	ctx.fill()

	const tail = Math.sin(t * 7) * 22
	const breath = Math.sin(t * 3) * 0.5
	const earWag = Math.sin(t * 3) * 5
	const tongueOut = Math.sin(t) > 0.3

	ctx.save()
	ctx.translate(54, 44)
	ctx.rotate((-40 + tail) * (Math.PI / 180))
	ctx.fillStyle = '#c8843c'
	ctx.beginPath()
	ctx.moveTo(-3, 0)
	ctx.lineTo(3, 0)
	ctx.lineTo(4, 18)
	ctx.lineTo(-4, 18)
	ctx.closePath()
	ctx.fill()
	ctx.fillStyle = '#f0e0c0'
	ctx.beginPath()
	ctx.ellipse(0, 18, 4, 5, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.restore()

	ctx.fillStyle = '#c8843c'
	ctx.beginPath()
	ctx.ellipse(34, 44 - breath, 20, 14, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.fillStyle = '#f0d090'
	ctx.beginPath()
	ctx.ellipse(34, 46 - breath, 12, 8, 0, 0, Math.PI * 2)
	ctx.fill()

	const legSwing = Math.sin(t * 4) * 3
	ctx.fillStyle = '#c8843c'
	ctx.save()
	ctx.translate(22, 52)
	ctx.rotate((legSwing * 0.08 * Math.PI) / 180)
	ctx.fillRect(-4, 0, 8, 10)
	ctx.fillStyle = '#f0c090'
	ctx.beginPath()
	ctx.ellipse(0, 11, 5, 3.5, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.restore()

	ctx.fillStyle = '#c8843c'
	ctx.save()
	ctx.translate(44, 52)
	ctx.rotate((-legSwing * 0.08 * Math.PI) / 180)
	ctx.fillRect(-4, 0, 8, 10)
	ctx.fillStyle = '#f0c090'
	ctx.beginPath()
	ctx.ellipse(0, 11, 5, 3.5, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.restore()

	ctx.fillStyle = '#c8843c'
	ctx.fillRect(26, 26, 14, 12)
	ctx.beginPath()
	ctx.ellipse(33, 20, 14, 12, 0, 0, Math.PI * 2)
	ctx.fill()

	ctx.fillStyle = '#8a5020'
	ctx.save()
	ctx.translate(20, 14)
	ctx.rotate(((-10 + earWag) * Math.PI) / 180)
	ctx.beginPath()
	ctx.ellipse(0, 8, 5, 10, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.restore()

	ctx.fillStyle = '#8a5020'
	ctx.save()
	ctx.translate(46, 14)
	ctx.rotate(((10 - earWag) * Math.PI) / 180)
	ctx.beginPath()
	ctx.ellipse(0, 8, 5, 10, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.restore()

	ctx.fillStyle = '#f0d090'
	ctx.beginPath()
	ctx.ellipse(33, 24, 8, 6, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.fillStyle = '#1a1010'
	ctx.beginPath()
	ctx.ellipse(33, 21, 5, 3.5, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.fillStyle = 'rgba(255,255,255,0.35)'
	ctx.beginPath()
	ctx.ellipse(31, 20, 2, 1.5, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.fillStyle = 'rgba(0,0,0,0.5)'
	ctx.beginPath()
	ctx.ellipse(30.5, 22, 1.2, 0.8, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.beginPath()
	ctx.ellipse(35.5, 22, 1.2, 0.8, 0, 0, Math.PI * 2)
	ctx.fill()

	ctx.strokeStyle = '#7a3010'
	ctx.lineWidth = 1.5
	ctx.beginPath()
	ctx.moveTo(30, 25.5)
	ctx.quadraticCurveTo(33, 28, 36, 25.5)
	ctx.stroke()

	if (tongueOut) {
		ctx.fillStyle = '#e04060'
		ctx.beginPath()
		ctx.ellipse(33, 29, 4, 5.5, 0, 0, Math.PI * 2)
		ctx.fill()
		ctx.strokeStyle = '#c02040'
		ctx.lineWidth = 1
		ctx.beginPath()
		ctx.moveTo(33, 25)
		ctx.lineTo(33, 33)
		ctx.stroke()
	}

	ctx.fillStyle = '#f8f0e0'
	ctx.beginPath()
	ctx.ellipse(28, 17, 4, 3.5, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.beginPath()
	ctx.ellipse(38, 17, 4, 3.5, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.fillStyle = '#6a3010'
	circ(ctx, 28, 17, 2.8)
	circ(ctx, 38, 17, 2.8)
	ctx.fillStyle = '#0a0500'
	circ(ctx, 28.5, 17, 1.8)
	circ(ctx, 38.5, 17, 1.8)
	ctx.fillStyle = 'rgba(255,255,255,0.7)'
	circ(ctx, 27.5, 15.5, 1)
	circ(ctx, 37.5, 15.5, 1)

	ctx.strokeStyle = '#6a3010'
	ctx.lineWidth = 1.5
	ctx.beginPath()
	ctx.moveTo(24, 13)
	ctx.lineTo(31, 12)
	ctx.stroke()
	ctx.beginPath()
	ctx.moveTo(35, 12)
	ctx.lineTo(42, 13)
	ctx.stroke()

	ctx.strokeStyle = '#c01020'
	ctx.lineWidth = 5
	ctx.beginPath()
	ctx.arc(33, 30, 9, 0.2, Math.PI - 0.2, false)
	ctx.stroke()
	ctx.fillStyle = '#d4a820'
	circ(ctx, 33, 35, 4)
	ctx.fillStyle = 'rgba(0,0,0,0.4)'
	ctx.font = 'bold 5px sans-serif'
	ctx.textAlign = 'center'
	ctx.fillText('♥', 33, 37)
}

const drawAvisos: DrawFn = (ctx, t) => {
	ctx.clearRect(0, 0, 48, 48)
	const bubbles = [
		{ x: 6, y: 6, w: 30, h: 14, tail: 'left' as const, col: '#c0192d', phase: 0 },
		{ x: 10, y: 26, w: 28, h: 13, tail: 'right' as const, col: '#8a1020', phase: 0.8 },
	]

	bubbles.forEach((b) => {
		const floatY = Math.sin(t * 2 + b.phase) * 2
		ctx.save()
		ctx.translate(0, floatY)
		ctx.fillStyle = b.col
		roundedRect(ctx, b.x, b.y, b.w, b.h, 6)
		ctx.fill()

		if (b.tail === 'left') {
			ctx.beginPath()
			ctx.moveTo(b.x + 4, b.y + b.h)
			ctx.lineTo(b.x - 4, b.y + b.h + 5)
			ctx.lineTo(b.x + 10, b.y + b.h)
			ctx.fill()
		} else {
			ctx.beginPath()
			ctx.moveTo(b.x + b.w - 4, b.y + b.h)
			ctx.lineTo(b.x + b.w + 4, b.y + b.h + 5)
			ctx.lineTo(b.x + b.w - 10, b.y + b.h)
			ctx.fill()
		}

		for (let i = 0; i < 3; i++) {
			const dotAlpha = 0.3 + 0.7 * (Math.sin(t * 4 - i * 0.7 + b.phase) > 0 ? 1 : 0)
			ctx.fillStyle = `rgba(255,200,200,${dotAlpha})`
			circ(ctx, b.x + 7 + i * 7, b.y + b.h / 2, 2)
		}
		ctx.restore()
	})
}

const drawObjetos: DrawFn = (ctx, t) => {
	ctx.clearRect(0, 0, 48, 48)
	const bounce = Math.abs(Math.sin(t * 3)) * 12
	const squish = 1 + Math.sin(t * 6) * 0.08
	const rot = Math.sin(t * 3) * 8
	const shadowScale = 0.4 + bounce / 30

	ctx.fillStyle = 'rgba(0,0,0,0.2)'
	ctx.beginPath()
	ctx.ellipse(24, 44, 12 * shadowScale, 3, 0, 0, Math.PI * 2)
	ctx.fill()

	ctx.save()
	ctx.translate(24, 36 - bounce)
	ctx.rotate((rot * Math.PI) / 180)
	ctx.scale(1 / squish, squish)
	ctx.fillStyle = '#c8752a'
	ctx.fillRect(-13, -12, 26, 22)

	const flapAngle = Math.sin(t * 2) * 0.3
	ctx.fillStyle = '#a85e1a'
	ctx.save()
	ctx.translate(-13, -12)
	ctx.rotate(flapAngle)
	ctx.fillRect(-1, -8, 13, 10)
	ctx.restore()

	ctx.save()
	ctx.translate(13, -12)
	ctx.rotate(-flapAngle)
	ctx.fillRect(-12, -8, 13, 10)
	ctx.restore()

	ctx.fillStyle = 'rgba(0,0,0,0.2)'
	ctx.fillRect(9, -12, 4, 22)
	ctx.fillStyle = '#e8c060'
	ctx.fillRect(-13, 0, 26, 5)
	ctx.fillRect(-2, -12, 4, 22)
	ctx.fillStyle = 'rgba(255,80,80,0.8)'
	ctx.font = 'bold 10px sans-serif'
	ctx.textAlign = 'center'
	ctx.fillText('!', 0, -2)
	ctx.restore()

	for (let i = 0; i < 4; i++) {
		const angle = t * 2 + i * (Math.PI / 2)
		const r = 18 + Math.sin(t * 3 + i) * 2
		const sx = 24 + Math.cos(angle) * r
		const sy = 30 - bounce + Math.sin(angle) * r
		const a = Math.sin(t * 4 + i) > 0 ? 0.8 : 0.1
		ctx.fillStyle = `rgba(255,200,80,${a})`
		ctx.font = '7px sans-serif'
		ctx.textAlign = 'center'
		ctx.fillText('✦', sx, sy)
	}
}

function AnimatedCanvas({ draw, width, height }: { draw: DrawFn; width: number; height: number }) {
	const ref = useAnimatedCanvas(draw)
	return (
		<canvas
			ref={ref}
			width={width}
			height={height}
			style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}
			aria-hidden
		/>
	)
}

export default function CreateHubPage() {
	const router = useRouter()
	const { currentUser, postCategories } = useApp()

	if (!currentUser) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: CST.fondo }}>
				<Card className="max-w-md w-full border-[#D8D2CC]">
					<CardContent className="p-6 text-center">
						<p className="text-[#2B2B2B] font-medium mb-4">Iniciá sesión para publicar</p>
						<Button
							onClick={() => router.push('/login')}
							style={{ backgroundColor: CST.bordo }}
							className="text-white w-full hover:bg-[#5A000E]"
						>
							Ir a iniciar sesión
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	const hasExtravios = postCategories.some((c) => c.slug === 'extravios')
	const hasAlertas = postCategories.some((c) => c.slug === 'alertas')
	const hasAvisos = postCategories.some((c) => c.slug === 'avisos')
	const hasObjetos = postCategories.some((c) => c.slug === 'objetos')
	const hasNoticias = postCategories.some((c) => c.slug === 'noticias')

	const primaryCards: PrimaryCard[] = [
		...(hasExtravios
			? [
					{
						id: 'missing',
						title: 'Persona extraviada',
						desc: 'Prioridad máxima: alerta masiva — solo emergencias reales.',
						badge: 'URGENTE',
						badgeBg: '#c0192d',
						badgeColor: '#ffe0e0',
						bg: 'linear-gradient(135deg,#8b0015 0%,#b3122d 100%)',
						draw: drawMissing,
						size: 72,
						targetHref: '/create/extravio',
					},
				]
			: []),
		...(hasAlertas
			? [
					{
						id: 'alert',
						title: 'Alerta importante',
						desc: `Título, descripción, hasta ${POST_MEDIA_LIMITS.maxImagesAlertas} fotos y hasta ${POST_MEDIA_LIMITS.maxVideosAlertas} videos.`,
						badge: 'PRIORITARIO',
						badgeBg: '#c04a00',
						badgeColor: '#ffe8d0',
						bg: 'linear-gradient(135deg,#9f1239 0%,#be123c 100%)',
						draw: drawAlert,
						size: 72,
						targetHref: '/create/alerta',
					},
				]
			: []),
		{
			id: 'pet',
			title: 'Mascotas',
			desc: 'Perdí o encontré — texto armado, ubicación, fecha, teléfono y 1 foto.',
			badge: 'MASCOTAS',
			badgeBg: '#9a6500',
			badgeColor: '#ffeaa0',
			bg: 'linear-gradient(135deg,#7a2538 0%,#a53b4f 100%)',
			draw: drawPet,
			size: 72,
			targetHref: '/create/animales',
		},
	]

	const secondaryCards: SecondaryCard[] = [
		...(hasAvisos
			? [
					{
						id: 'avisos',
						title: 'Avisos',
						desc: `Título, texto, WhatsApp y hasta ${POST_MEDIA_LIMITS.maxImagesPerPost} fotos o videos.`,
						draw: drawAvisos,
						size: 48,
						targetHref: '/create/otro?categoria=avisos',
					},
				]
			: []),
		...(hasObjetos
			? [
					{
						id: 'objetos',
						title: 'Objetos',
						desc: 'Perdí, encontré, vendo o regalo.',
						draw: drawObjetos,
						size: 48,
						targetHref: '/create/otro?categoria=objetos',
					},
				]
			: []),
		...(hasNoticias
			? [
					{
						id: 'noticias',
						title: 'Noticias',
						desc: `Título y texto. Hasta ${POST_MEDIA_LIMITS.maxImagesNoticias} fotos y ${POST_MEDIA_LIMITS.maxVideosNoticias} video.`,
						draw: drawAvisos,
						size: 48,
						targetHref: '/create/otro?categoria=noticias',
					},
				]
			: []),
	]

	return (
		<DashboardLayout>
			<style>{`
				@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800&family=DM+Sans:wght@400;500&display=swap');
				.alert-wrap {
					background: transparent;
					border-radius: 0;
					min-height: calc(100svh - 1rem);
					padding: 16px 12px 28px;
					font-family: 'DM Sans', sans-serif;
				}
				.alert-header { text-align: center; margin-bottom: 22px; }
				.alert-header-sub {
					font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;
					color: rgba(139, 0, 21, 0.55); margin-bottom: 6px;
				}
				.alert-header-title { font-size: 20px; font-weight: 800; color: #2b2b2b; font-family: 'Sora', sans-serif; margin: 0; }
				.alert-header-title span { color: #8b0015; }
				.card-big {
					border-radius: 18px; margin-bottom: 12px; position: relative; cursor: pointer; border: 0;
					transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s; overflow: hidden; user-select: none;
				}
				.card-big:active { transform: scale(0.97); }
				.card-big.selected { border-color: rgba(255,100,100,0.6); box-shadow: 0 0 0 2px rgba(255,80,80,0.25); }
				.card-inner { display: flex; align-items: center; gap: 14px; padding: 16px; position: relative; z-index: 2; }
				.card-scene {
					width: 72px; height: 72px; flex-shrink: 0; border-radius: 14px; background: transparent;
					border: 0; overflow: hidden;
				}
				.card-text { flex: 1; min-width: 0; }
				.card-title { font-size: 15px; font-weight: 700; color: #fff; margin: 0 0 5px; font-family: 'Sora', sans-serif; }
				.card-desc { font-size: 11.5px; color: rgba(255,255,255,0.6); line-height: 1.5; margin: 0; }
				.card-badge {
					position: absolute; top: 10px; right: 10px; font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
					padding: 3px 7px; border-radius: 20px; z-index: 3; font-family: 'Sora', sans-serif;
				}
				.card-arrow { color: rgba(255,255,255,0.3); font-size: 20px; flex-shrink: 0; line-height: 1; }
				.others-label { display: flex; align-items: center; gap: 10px; margin: 6px 0 12px; }
				.others-label-line { flex: 1; height: 1px; background: rgba(139,0,21,0.18); }
				.others-label-text {
					font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(122,92,82,0.9); font-family: 'Sora', sans-serif;
				}
				.others-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
				.card-sm {
					border-radius: 16px; background: #ffffff; border: 0;
					padding: 14px 12px; cursor: pointer; transition: transform 0.2s, border-color 0.2s; user-select: none;
				}
				.card-sm:active { transform: scale(0.96); }
				.card-sm.selected { border-color: rgba(255,100,100,0.5); }
				.card-sm-scene {
					width: 48px; height: 48px; border-radius: 12px; background: transparent;
					border: 0; margin-bottom: 10px; overflow: hidden;
				}
				.card-sm-title { font-size: 13px; font-weight: 700; color: #2b2b2b; margin: 0 0 4px; font-family: 'Sora', sans-serif; }
				.card-sm-desc { font-size: 10.5px; color: #7a5c52; line-height: 1.4; margin: 0; }
				.free-card {
					margin-top: 12px; border-radius: 16px; border: 0; background: #ffffff;
					padding: 14px 12px; cursor: pointer; transition: border-color .2s, background .2s;
				}
				.free-card.selected { border-color: rgba(139,0,21,0.55); background: #fff7f8; }
				.free-title { color: #2b2b2b; font-size: 13px; font-weight: 700; font-family: 'Sora', sans-serif; margin: 0; }
				.free-desc { color: #7a5c52; font-size: 10.5px; margin-top: 4px; line-height: 1.4; }
				.cta-wrap { margin-top: 18px; text-align: center; }
				.cta-btn {
					background: linear-gradient(90deg, #c0192d, #8b0018); border: 1px solid rgba(255,100,100,0.3); color: #fff; font-size: 14px;
					font-weight: 700; padding: 13px 32px; border-radius: 40px; cursor: pointer; letter-spacing: 0.05em; transition: transform 0.15s;
					font-family: 'Sora', sans-serif;
				}
				.cta-btn:active { transform: scale(0.96); }
			`}</style>
			<div className="mx-auto w-full max-w-[680px] pb-6 sm:pb-8">
				<div className="mb-3 flex items-center gap-3">
					<Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 text-white hover:bg-white/10">
						<ArrowLeft className="w-5 h-5" />
					</Button>
				</div>
				<div className="alert-wrap sm:rounded-2xl">
					<div className="alert-header">
						<p className="alert-header-sub">Elegí con un toque qué querés avisar</p>
						<h1 className="alert-header-title">
							¿Qué <span>necesitás</span> reportar?
						</h1>
					</div>

					{primaryCards.map((card) => (
						<div
							key={card.id}
							className="card-big"
							style={{ background: card.bg }}
							onClick={() => router.push(card.targetHref)}
						>
							<span className="card-badge" style={{ background: card.badgeBg, color: card.badgeColor }}>
								{card.badge}
							</span>
							<div className="card-inner">
								<div className="card-scene">
									<AnimatedCanvas draw={card.draw} width={card.size} height={card.size} />
								</div>
								<div className="card-text">
									<p className="card-title">{card.title}</p>
									<p className="card-desc">{card.desc}</p>
								</div>
								<span className="card-arrow">›</span>
							</div>
						</div>
					))}

					{secondaryCards.length > 0 ? (
						<>
							<div className="others-label">
								<div className="others-label-line" />
								<span className="others-label-text">Otras categorías</span>
								<div className="others-label-line" />
							</div>
							<div className="others-grid">
								{secondaryCards.map((card) => (
									<div
										key={card.id}
										className="card-sm"
										onClick={() => router.push(card.targetHref)}
									>
										<div className="card-sm-scene">
											<AnimatedCanvas draw={card.draw} width={card.size} height={card.size} />
										</div>
										<p className="card-sm-title">{card.title}</p>
										<p className="card-sm-desc">{card.desc}</p>
									</div>
								))}
							</div>
						</>
					) : null}

					<div className="free-card" onClick={() => router.push('/create/otro')}>
						<p className="free-title flex items-center gap-2">
							<span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10">
								<LayoutGrid className="h-4 w-4" />
							</span>
							<span className="inline-flex items-center gap-2">
								<PenLine className="h-4 w-4 text-[#ff8a9a]" />
								Otra categoría / texto libre
							</span>
						</p>
						<p className="free-desc">Proponé el nombre de la categoría y el contenido; si la aprueban, se crea en la comunidad.</p>
					</div>

				</div>
			</div>
		</DashboardLayout>
	)
}
