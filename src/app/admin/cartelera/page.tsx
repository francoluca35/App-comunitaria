'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { ArrowLeft, Banknote, CheckCircle, Loader2, Megaphone, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ensureStorageObjectPublicUrl } from '@/lib/storage-image'
import { DeletePublicidadButton } from '@/components/DeletePublicidadButton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { adminCarteleraItemUrl, adminCarteleraListUrl } from '@/lib/admin-cartelera-api'

type AdminRequest = {
	id: string
	title: string
	description: string
	phone_number: string | null
	instagram: string | null
	images: string[]
	days_active: number
	status: string
	price_amount: number
	created_at: string
}

function statusLabel(status: string): string {
	switch (status) {
		case 'pending':
			return 'Pendiente'
		case 'payment_pending':
			return 'Pendiente de pago'
		case 'rejected':
			return 'Rechazada'
		case 'active':
			return 'Activa'
		default:
			return status
	}
}

function AdminPublicidadCard({
	req,
	actionBusyId,
	onActivate,
	onGeneratePayment,
	onDeleted,
	showPendingActions,
}: {
	req: AdminRequest
	actionBusyId: string | null
	onActivate?: () => void
	onGeneratePayment?: () => void
	onDeleted: () => void
	showPendingActions?: boolean
}) {
	const busy = actionBusyId === req.id

	return (
		<Card className="overflow-hidden">
			<CardHeader>
				<div className="flex items-start gap-4">
					<div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
						{req.images?.[0] ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={ensureStorageObjectPublicUrl(req.images[0])}
								alt={req.title}
								className="w-full h-full object-cover"
								loading="lazy"
								decoding="async"
							/>
						) : (
							<Megaphone className="w-7 h-7 text-slate-400" />
						)}
					</div>
					<div className="min-w-0 flex-1">
						<CardTitle className="text-base truncate">{req.title}</CardTitle>
						<CardDescription className="mt-1 line-clamp-3">{req.description}</CardDescription>
						<div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
							<span className="inline-flex items-center gap-1">
								<Banknote className="w-3.5 h-3.5" />
								{req.days_active} días · {statusLabel(req.status)}
								{req.price_amount > 0 ? ` · $${req.price_amount}` : ''}
							</span>
						</div>
						{(req.phone_number || req.instagram) && (
							<div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
								{req.phone_number ? `Tel: ${req.phone_number}` : null}
								{req.phone_number && req.instagram ? ' · ' : null}
								{req.instagram ? `IG: ${req.instagram}` : null}
							</div>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent className="flex flex-wrap gap-2 justify-end">
				{showPendingActions ? (
					<>
						<Button
							variant="outline"
							disabled={busy}
							onClick={onGeneratePayment}
							className="gap-2"
						>
							{busy ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Wallet className="w-4 h-4" />
							)}
							Generar pago
						</Button>
						<Button disabled={busy} onClick={onActivate} className="gap-2">
							{busy ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<CheckCircle className="w-4 h-4" />
							)}
							Activar publicidad
						</Button>
					</>
				) : null}
				<DeletePublicidadButton publicidadId={req.id} variant="admin" onDeleted={onDeleted} />
			</CardContent>
		</Card>
	)
}

export default function AdminCarteleraPage() {
	const router = useRouter()
	const { currentUser } = useApp()

	const [adminLoading, setAdminLoading] = useState(false)
	const [pending, setPending] = useState<AdminRequest[]>([])
	const [active, setActive] = useState<AdminRequest[]>([])
	const [actionBusyId, setActionBusyId] = useState<string | null>(null)

	const getAccessToken = useCallback(async () => {
		const supabase = createClient()
		const { data: sessionData } = await supabase.auth.getSession()
		return sessionData.session?.access_token ?? null
	}, [])

	const fetchByStatus = useCallback(
		async (status: string): Promise<AdminRequest[]> => {
			const accessToken = await getAccessToken()
			if (!accessToken) return []
			const res = await fetch(adminCarteleraListUrl(status), {
				headers: { Authorization: `Bearer ${accessToken}` },
			})
			if (!res.ok) throw new Error('No se pudo cargar')
			const data = (await res.json().catch(() => [])) as unknown
			return Array.isArray(data) ? (data as AdminRequest[]) : []
		},
		[getAccessToken]
	)

	const refreshAdminLists = useCallback(async () => {
		if (!currentUser?.isAdmin) return
		setAdminLoading(true)
		try {
			const [pendingRows, activeRows] = await Promise.all([
				fetchByStatus('pending_all'),
				fetchByStatus('active'),
			])
			setPending(pendingRows)
			setActive(activeRows)
		} catch {
			toast.error('No se pudieron cargar las publicidades')
		} finally {
			setAdminLoading(false)
		}
	}, [currentUser?.isAdmin, fetchByStatus])

	useEffect(() => {
		if (!currentUser) return
		if (!currentUser.isAdmin) {
			router.replace('/cartelera/crear')
			return
		}
		void refreshAdminLists()
	}, [currentUser, refreshAdminLists, router])

	const adminAct = async (id: string, action: 'activate' | 'generate_payment') => {
		if (!currentUser?.isAdmin) return
		const accessToken = await getAccessToken()
		if (!accessToken) return

		setActionBusyId(id)
		try {
			const res = await fetch(adminCarteleraItemUrl(id), {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ action }),
			})
			const data = await res.json().catch(() => ({}))
			if (!res.ok) {
				toast.error((data as { error?: string }).error ?? 'No se pudo actualizar')
				return
			}
			toast.success(
				action === 'activate'
					? 'Publicidad activada. El propietario fue notificado.'
					: 'Se envió la notificación de pago al propietario.'
			)
			await refreshAdminLists()
		} catch {
			toast.error('Error de conexión')
		} finally {
			setActionBusyId(null)
		}
	}

	const pendingCount = useMemo(() => pending.length, [pending])

	if (!currentUser?.isAdmin) {
		return (
			<DashboardLayout>
				<div className="w-full max-w-3xl mx-auto pb-8 flex justify-center py-10">
					<Loader2 className="w-7 h-7 animate-spin text-slate-400" />
				</div>
			</DashboardLayout>
		)
	}

	return (
		<DashboardLayout>
			<div className="w-full max-w-3xl mx-auto pb-8">
				<div className="flex items-center gap-3 mb-4">
					<Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
						<ArrowLeft className="w-5 h-5" />
					</Button>
					<div>
						<h1 className="text-xl font-semibold text-slate-900 dark:text-white">
							Solicitudes de publicidades
						</h1>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Pendientes: <strong>{pendingCount}</strong> · Activas:{' '}
							<strong>{active.length}</strong>
						</p>
					</div>
				</div>

				<Tabs defaultValue="pending" className="space-y-4">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="pending">Pendiente ({pendingCount})</TabsTrigger>
						<TabsTrigger value="active">Activa ({active.length})</TabsTrigger>
					</TabsList>

					{adminLoading ? (
						<div className="flex justify-center py-10">
							<Loader2 className="w-7 h-7 animate-spin text-slate-400" />
						</div>
					) : (
						<>
							<TabsContent value="pending" className="space-y-4 mt-0">
								{pending.length === 0 ? (
									<Card>
										<CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
											No hay solicitudes pendientes.
										</CardContent>
									</Card>
								) : (
									pending.map((req) => (
										<AdminPublicidadCard
											key={req.id}
											req={req}
											actionBusyId={actionBusyId}
											onActivate={() => void adminAct(req.id, 'activate')}
											onGeneratePayment={() => void adminAct(req.id, 'generate_payment')}
											onDeleted={() => void refreshAdminLists()}
											showPendingActions
										/>
									))
								)}
							</TabsContent>

							<TabsContent value="active" className="space-y-4 mt-0">
								{active.length === 0 ? (
									<Card>
										<CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
											No hay publicidades activas.
										</CardContent>
									</Card>
								) : (
									active.map((req) => (
										<AdminPublicidadCard
											key={req.id}
											req={req}
											actionBusyId={actionBusyId}
											onDeleted={() => void refreshAdminLists()}
										/>
									))
								)}
							</TabsContent>
						</>
					)}
				</Tabs>
			</div>
		</DashboardLayout>
	)
}
