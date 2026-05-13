import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ensureWebPushConfigured } from '@/lib/web-push-config'
import {
	buildWebPushPayload,
	isUuid,
	sendWebPushToUserDevices,
	type NotificationPushRecord,
} from '@/lib/web-push-dispatch'

/**
 * Database Webhook de Supabase → Web Push en segundo plano.
 *
 * Tipos soportados: `community_alert`, `community_alert_critical`, `message` (chat).
 * Los mensajes también se envían vía POST /api/push/dispatch-message (más rápido); este webhook actúa de respaldo.
 *
 * Configuración: ver docs/PUSH_WEBHOOK_SETUP.md
 */

function webhookSecretValid(request: NextRequest, expected: string): boolean {
	if (!expected) return false

	const fromHeader =
		request.headers.get('x-webhook-secret') ??
		request.headers.get('X-Webhook-Secret') ??
		request.headers.get('x-supabase-webhook-secret')

	const auth = request.headers.get('authorization')
	let fromBearer: string | null = null
	if (auth?.startsWith('Bearer ')) {
		fromBearer = auth.slice(7).trim()
	} else if (auth && !auth.includes(' ')) {
		fromBearer = auth.trim()
	}

	const received = fromHeader ?? fromBearer
	if (received == null || received.length === 0) return false

	try {
		const a = Buffer.from(received, 'utf8')
		const b = Buffer.from(expected, 'utf8')
		if (a.length !== b.length) return false
		return timingSafeEqual(a, b)
	} catch {
		return false
	}
}

function parseSupabaseInsertPayload(raw: unknown): NotificationPushRecord | null {
	if (!raw || typeof raw !== 'object') return null
	const o = raw as Record<string, unknown>

	if (o.type === 'INSERT' && typeof o.table === 'string' && typeof o.record === 'object' && o.record !== null) {
		const table = o.table.toLowerCase()
		const schema = typeof o.schema === 'string' ? o.schema.toLowerCase() : 'public'
		if (schema !== 'public' || table !== 'notifications') return null
		return o.record as NotificationPushRecord
	}

	if (typeof o.record === 'object' && o.record !== null) {
		const r = o.record as NotificationPushRecord
		if (typeof r.user_id === 'string' && typeof r.type === 'string') return r
	}
	if (o.payload && typeof o.payload === 'object') {
		const p = o.payload as Record<string, unknown>
		if (p.record && typeof p.record === 'object') {
			return parseSupabaseInsertPayload({
				type: (p.type as string) ?? 'INSERT',
				table: (p.table as string) ?? 'notifications',
				schema: (p.schema as string) ?? 'public',
				record: p.record,
			})
		}
	}

	return null
}

export async function POST(request: NextRequest) {
	const secret = process.env.PUSH_WEBHOOK_SECRET
	if (!secret?.trim()) {
		return NextResponse.json({ error: 'PUSH_WEBHOOK_SECRET no configurado' }, { status: 503 })
	}

	if (!webhookSecretValid(request, secret)) {
		return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
	}

	if (!ensureWebPushConfigured()) {
		return NextResponse.json({ error: 'VAPID no configurado' }, { status: 503 })
	}

	let raw: unknown
	try {
		raw = await request.json()
	} catch {
		return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
	}

	const record = parseSupabaseInsertPayload(raw)
	if (!record) {
		return NextResponse.json({ ok: true, skipped: true, reason: 'not_notifications_insert' })
	}

	const pushPayload = buildWebPushPayload(record)
	if (!pushPayload) {
		return NextResponse.json({ ok: true, skipped: true, reason: 'unsupported_notification_type' })
	}

	const userId = record.user_id
	if (!userId || !isUuid(userId)) {
		return NextResponse.json({ ok: true, skipped: true, reason: 'invalid_user_id' })
	}

	const supabase = createServiceRoleClient()
	if (!supabase) {
		return NextResponse.json({ error: 'Service role no disponible' }, { status: 503 })
	}

	const { sent, errors, fatal } = await sendWebPushToUserDevices(supabase, userId, pushPayload)

	if (fatal) {
		return NextResponse.json({ error: errors[0] ?? 'DB error' }, { status: 500 })
	}

	return NextResponse.json({
		ok: true,
		sent,
		kind: record.type === 'message' ? 'message' : 'community_alert',
		...(errors.length ? { partial_errors: errors.slice(0, 3) } : {}),
		...(sent === 0 && !errors.length ? { reason: 'no_subscriptions' } : {}),
	})
}

export async function GET() {
	const hasSecret = Boolean(process.env.PUSH_WEBHOOK_SECRET?.trim())
	const hasVapidPublic = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim())
	const hasVapidPrivate = Boolean(process.env.VAPID_PRIVATE_KEY?.trim())
	const vapid = hasVapidPublic && hasVapidPrivate
	const ready = hasSecret && vapid
	const missing: string[] = []
	if (!hasSecret) missing.push('PUSH_WEBHOOK_SECRET')
	if (!hasVapidPublic) missing.push('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
	if (!hasVapidPrivate) missing.push('VAPID_PRIVATE_KEY')
	return NextResponse.json({
		service: 'push-webhook',
		ready,
		checks: {
			PUSH_WEBHOOK_SECRET: hasSecret,
			NEXT_PUBLIC_VAPID_PUBLIC_KEY: hasVapidPublic,
			VAPID_PRIVATE_KEY: hasVapidPrivate,
		},
		...(missing.length ? { missing } : {}),
		hint: 'POST: INSERT en notifications → community_alert, community_alert_critical o message (chat). Ver docs/PUSH_WEBHOOK_SETUP.md',
	})
}
