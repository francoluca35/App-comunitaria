'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { DashboardLayout } from '@/components/DashboardLayout'
import { CategoryBadge } from '@/components/CategoryBadge'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import { Card, CardContent } from '@/app/components/ui/card'
import { ArgentinaWhatsAppPhoneField } from '@/components/ArgentinaWhatsAppPhoneField'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import {
	buildArgentinaMobileE164,
	DEFAULT_ARGENTINA_PROVINCE_PREFIX,
	normalizeArgentinaLocalDigits,
	parseArgentinaMobileStored,
	validateArgentinaAreaCode,
	validateArgentinaLocalDigits,
} from '@/lib/argentina-phone'

export default function EditarPublicacionPage() {
	const params = useParams<{ postId: string }>()
	const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId
	const router = useRouter()
	const { posts, currentUser, authLoading, hydratePostFromServer, updatePost, config } = useApp()

	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [saleSubcategory, setSaleSubcategory] = useState('')
	const [salePrice, setSalePrice] = useState('')
	const [whatsappPrefix, setWhatsappPrefix] = useState(DEFAULT_ARGENTINA_PROVINCE_PREFIX)
	const [whatsappLocal, setWhatsappLocal] = useState('')
	const [hydrating, setHydrating] = useState(true)
	const [saving, setSaving] = useState(false)
	const [initialized, setInitialized] = useState(false)

	const post = useMemo(() => posts.find((p) => p.id === postId), [posts, postId])

	useEffect(() => {
		if (!authLoading && !currentUser) {
			router.replace('/login')
		}
	}, [authLoading, currentUser, router])

	useEffect(() => {
		if (!postId) return
		let cancelled = false
		;(async () => {
			setHydrating(true)
			if (!posts.some((p) => p.id === postId)) {
				await hydratePostFromServer(postId)
			}
			if (!cancelled) setHydrating(false)
		})()
		return () => {
			cancelled = true
		}
	}, [postId, posts, hydratePostFromServer])

	useEffect(() => {
		if (!post || initialized) return
		setTitle(post.title)
		setDescription(post.description)
		setSaleSubcategory(post.saleSubcategory?.trim() ?? '')
		setSalePrice(post.salePrice?.trim() ?? '')
		const parsed = parseArgentinaMobileStored(post.whatsappNumber)
		if (parsed) {
			setWhatsappPrefix(parsed.prefix)
			setWhatsappLocal(parsed.local)
		} else {
			setWhatsappPrefix(DEFAULT_ARGENTINA_PROVINCE_PREFIX)
			setWhatsappLocal('')
		}
		setInitialized(true)
	}, [post, initialized])

	if (!currentUser) return null

	if (hydrating && !post) {
		return (
			<DashboardLayout>
				<div className="mx-auto max-w-lg py-12 text-center text-slate-500">Cargando publicación…</div>
			</DashboardLayout>
		)
	}

	if (!post) {
		return (
			<DashboardLayout>
				<div className="mx-auto max-w-lg py-12 text-center">
					<p className="text-slate-600 mb-4">No encontramos esa publicación.</p>
					<Button asChild variant="outline">
						<Link href="/mis-publicaciones">Volver</Link>
					</Button>
				</div>
			</DashboardLayout>
		)
	}

	if (post.authorId !== currentUser.id) {
		return (
			<DashboardLayout>
				<div className="mx-auto max-w-lg py-12 text-center">
					<p className="text-slate-600 mb-4">Solo podés editar tus propias publicaciones.</p>
					<Button asChild variant="outline">
						<Link href="/">Volver al inicio</Link>
					</Button>
				</div>
			</DashboardLayout>
		)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		const tit = title.trim()
		const desc = description.trim()
		if (!tit) {
			toast.error('Completá el título')
			return
		}
		if (!desc) {
			toast.error('Completá la descripción')
			return
		}

		let whatsappNumber: string | null = null
		if (config.whatsappEnabled) {
			const local = normalizeArgentinaLocalDigits(whatsappLocal)
			if (local) {
				if (!validateArgentinaAreaCode(whatsappPrefix)) {
					toast.error('Ingresá un código de área válido (2 a 4 dígitos)')
					return
				}
				if (!validateArgentinaLocalDigits(local)) {
					toast.error('Revisá el número de WhatsApp')
					return
				}
				whatsappNumber = buildArgentinaMobileE164(whatsappPrefix, local)
				if (!whatsappNumber) {
					toast.error('Número de WhatsApp inválido')
					return
				}
			}
		}

		if (post.category === 'venta') {
			const sub = saleSubcategory.trim()
			if (sub.length > 0 && sub.length < 2) {
				toast.error('La subcategoría debe tener al menos 2 letras')
				return
			}
		}

		setSaving(true)
		try {
			const result = await updatePost(post.id, {
				title: tit,
				description: desc,
				whatsappNumber: config.whatsappEnabled ? whatsappNumber : undefined,
				...(post.category === 'venta'
					? {
							saleSubcategory: saleSubcategory.trim() || null,
							salePrice: salePrice.trim() || null,
						}
					: {}),
			})
			if (!result.ok) {
				toast.error(result.error ?? 'No se pudo guardar')
				return
			}
			toast.success('Publicación actualizada. Sigue visible sin nueva moderación.')
			router.push('/mis-publicaciones')
		} finally {
			setSaving(false)
		}
	}

	return (
		<DashboardLayout>
			<div className="mx-auto max-w-lg px-1 pb-8">
				<div className="mb-4 flex items-center gap-2">
					<Button type="button" variant="ghost" size="icon" onClick={() => router.back()} aria-label="Volver">
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<h1 className="text-xl font-bold text-[#2B2B2B]">Editar publicación</h1>
				</div>

				<p className="mb-4 text-sm text-[#7A5C52]">
					Los cambios se guardan al instante y <strong>no pasan otra vez por moderación</strong> si ya estaba
					aprobada.
				</p>

				<Card>
					<CardContent className="space-y-4 pt-6">
						<div className="flex items-center gap-2">
							<span className="text-sm text-[#7A5C52]">Categoría:</span>
							<CategoryBadge category={post.category} />
							{post.status === 'pending' ? (
								<span className="text-xs text-amber-700">(pendiente)</span>
							) : null}
						</div>

						<form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
							{post.category === 'venta' ? (
								<>
									<div className="space-y-1.5">
										<Label htmlFor="sale-sub">Subcategoría</Label>
										<Input
											id="sale-sub"
											value={saleSubcategory}
											onChange={(e) => setSaleSubcategory(e.target.value)}
											placeholder="Ej. Perfumes, Ropa…"
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="sale-price">Precio</Label>
										<Input
											id="sale-price"
											value={salePrice}
											onChange={(e) => setSalePrice(e.target.value)}
											placeholder="Ej. $ 15.000, Consultar"
										/>
									</div>
								</>
							) : null}

							<div className="space-y-1.5">
								<Label htmlFor="title">Título</Label>
								<Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="description">Descripción</Label>
								<Textarea
									id="description"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									rows={6}
									required
								/>
							</div>

							{config.whatsappEnabled ? (
								<ArgentinaWhatsAppPhoneField
									idPrefix="edit-post-wa"
									prefix={whatsappPrefix}
									onPrefixChange={setWhatsappPrefix}
									localNumber={whatsappLocal}
									onLocalNumberChange={setWhatsappLocal}
									optional
									label="WhatsApp (opcional)"
									hint="Agregá o corregí tu contacto para que te escriban."
								/>
							) : null}

							<Button type="submit" className="w-full gap-2" disabled={saving}>
								<Save className="h-4 w-4" />
								{saving ? 'Guardando…' : 'Guardar cambios'}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	)
}
