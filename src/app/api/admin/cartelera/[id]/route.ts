import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
	VALOR_PUBLICITARIO_CONFIG_KEY,
	VALOR_PUBLICITARIO_LATERAL_CONFIG_KEY,
	parseValorPublicitarioJsonb,
} from '@/lib/server/valor-publicitario'
import { deletePublicidadById } from '@/lib/server/publicidad-expiration'
import {
	PUBLICIDAD_DATOS_PAGO_CONFIG_KEY,
	formatPublicidadDatosPagoBody,
	hasPublicidadDatosPago,
	parsePublicidadDatosPagoJsonb,
} from '@/lib/server/publicidad-payment-config'

const PENDING_STATUSES = new Set(['pending', 'payment_pending', 'rejected'])

async function computePriceAmount(
	supabase: ReturnType<typeof import('@/lib/supabase/server').createClient>,
	daysActive: number,
	promoteLateral: boolean
): Promise<number> {
	const [{ data: configMainRow }, { data: configLateralRow }] = await Promise.all([
		supabase.from('app_config').select('value').eq('key', VALOR_PUBLICITARIO_CONFIG_KEY).maybeSingle(),
		supabase
			.from('app_config')
			.select('value')
			.eq('key', VALOR_PUBLICITARIO_LATERAL_CONFIG_KEY)
			.maybeSingle(),
	])

	const valorMain = parseValorPublicitarioJsonb(configMainRow?.value)
	const valorLateral = parseValorPublicitarioJsonb(configLateralRow?.value)
	const perDay = valorMain + (promoteLateral ? valorLateral : 0)
	return perDay * daysActive
}

async function insertOwnerNotification(
	serviceClient: ReturnType<typeof createServiceRoleClient>,
	ownerId: string,
	type: 'publicidad_active' | 'publicidad_payment_link',
	title: string,
	body: string,
	publicidadId: string
) {
	if (!serviceClient) return
	const { error } = await serviceClient.from('notifications').insert({
		user_id: ownerId,
		type,
		title,
		body,
		link_url: '/mis-publicidades',
		related_id: publicidadId,
	})
	if (error) {
		console.error(`insert notification ${type}:`, error)
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireAdmin(request)
	if (!auth.ok) return auth.response

	let body: { action?: unknown }
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
	}

	const action = typeof body.action === 'string' ? body.action : ''
	if (!['activate', 'generate_payment'].includes(action)) {
		return NextResponse.json({ error: 'action inválida' }, { status: 400 })
	}

	const { id } = await params
	if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

	const { data: requestRow, error: reqError } = await auth.supabase
		.from('publicidad_requests')
		.select('id,owner_id,title,days_active,status,promote_lateral,price_amount')
		.eq('id', id)
		.single()

	if (reqError || !requestRow) {
		return NextResponse.json({ error: reqError?.message ?? 'No encontrado' }, { status: 404 })
	}
	if (!PENDING_STATUSES.has(requestRow.status)) {
		return NextResponse.json(
			{ error: 'Solo se pueden gestionar solicitudes pendientes' },
			{ status: 400 }
		)
	}

	const db = auth.serviceClient ?? auth.supabase
	const title = String(requestRow.title ?? 'Publicidad').trim() || 'Publicidad'

	if (action === 'activate') {
		const now = new Date()
		const endAt = new Date(now.getTime() + requestRow.days_active * 24 * 60 * 60 * 1000)

		const { error } = await db
			.from('publicidad_requests')
			.update({
				status: 'active',
				start_at: now.toISOString(),
				end_at: endAt.toISOString(),
				payment_token: null,
				payment_link_url: null,
			})
			.eq('id', id)

		if (error) return NextResponse.json({ error: error.message }, { status: 500 })

		await insertOwnerNotification(
			auth.serviceClient,
			requestRow.owner_id,
			'publicidad_active',
			'Publicidad activada',
			`Tu publicidad «${title}» ya está activa y visible en la cartelera.`,
			id
		)

		return NextResponse.json({ ok: true })
	}

	const { data: configRow, error: configError } = await auth.supabase
		.from('app_config')
		.select('value')
		.eq('key', PUBLICIDAD_DATOS_PAGO_CONFIG_KEY)
		.maybeSingle()

	if (configError) {
		console.error('PATCH cartelera generate_payment config error:', configError)
	}

	const datosPago = parsePublicidadDatosPagoJsonb(configRow?.value)
	if (!hasPublicidadDatosPago(datosPago)) {
		return NextResponse.json(
			{
				error:
					'Configurá un alias o CBU en Gestión publicitaria antes de generar el cobro',
			},
			{ status: 400 }
		)
	}

	const price_amount =
		typeof requestRow.price_amount === 'number' && requestRow.price_amount > 0
			? requestRow.price_amount
			: await computePriceAmount(auth.supabase, requestRow.days_active, requestRow.promote_lateral === true)

	const datosTexto = formatPublicidadDatosPagoBody(datosPago)
	const bodyNotif =
		`Tu publicidad «${title}» tiene un pago pendiente de $${price_amount}.\n\n` +
		`Transferí el total a:\n${datosTexto}\n\n` +
		`Cuando recibamos el pago, activaremos tu publicidad.`

	const { error } = await db
		.from('publicidad_requests')
		.update({
			status: 'payment_pending',
			price_amount,
			payment_token: null,
			payment_link_url: null,
		})
		.eq('id', id)

	if (error) return NextResponse.json({ error: error.message }, { status: 500 })

	await insertOwnerNotification(
		auth.serviceClient,
		requestRow.owner_id,
		'publicidad_payment_link',
		'Pago de publicidad pendiente',
		bodyNotif,
		id
	)

	return NextResponse.json({ ok: true, price_amount })
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireAdmin(request)
	if (!auth.ok) return auth.response

	const db = auth.serviceClient ?? auth.supabase
	const { id } = await params
	if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

	const deleted = await deletePublicidadById(db, id)
	if (!deleted.ok) {
		const status = deleted.error === 'No encontrado' ? 404 : 500
		return NextResponse.json({ error: deleted.error ?? 'No se pudo eliminar' }, { status })
	}

	return NextResponse.json({ ok: true })
}
