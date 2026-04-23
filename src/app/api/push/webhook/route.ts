import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ensureWebPushConfigured, webpush } from '@/lib/web-push-config'

/**
 * Database Webhook de Supabase → push en segundo plano para alertas.
 *
 * Payload oficial (INSERT):
 * https://supabase.com/docs/guides/database/webhooks
 *
 * Configuración resumida: ver docs/PUSH_WEBHOOK_SETUP.md
 */

type NotificationRecord = {
  user_id?: string
  type?: string
  title?: string
  body?: string | null
  link_url?: string | null
  related_id?: string | null
}

/** Comparación en tiempo constante para el secreto del webhook. */
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

function parseSupabaseInsertPayload(raw: unknown): NotificationRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  // Formato estándar Supabase Database Webhook
  if (o.type === 'INSERT' && typeof o.table === 'string' && typeof o.record === 'object' && o.record !== null) {
    const table = o.table.toLowerCase()
    const schema = typeof o.schema === 'string' ? o.schema.toLowerCase() : 'public'
    if (schema !== 'public' || table !== 'notifications') return null
    return o.record as NotificationRecord
  }

  // Variantes / proxies
  if (typeof o.record === 'object' && o.record !== null) {
    const r = o.record as NotificationRecord
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_RE.test(s)
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

  const isCommunityAlert =
    record.type === 'community_alert' || record.type === 'community_alert_critical'
  if (!isCommunityAlert) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'not_community_alert' })
  }

  const userId = record.user_id
  if (!userId || !isUuid(userId)) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'invalid_user_id' })
  }

  const supabase = createServiceRoleClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Service role no disponible' }, { status: 503 })
  }

  const { data: rows, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error) {
    console.error('[push/webhook] select push_subscriptions:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!rows?.length) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no_subscriptions' })
  }

  const isCritical = record.type === 'community_alert_critical'
  const tag = isCritical
    ? `extravio-alert-${record.related_id ?? 'unknown'}`
    : `community-alert-${record.related_id ?? 'unknown'}`
  const payload = JSON.stringify({
    title: record.title ?? 'Alerta',
    body: record.body ?? '',
    tag,
    url: record.link_url ?? '/',
    urgent: true,
    critical: isCritical,
  })

  let sent = 0
  const errors: string[] = []

  for (const row of rows) {
    const sub = {
      endpoint: row.endpoint as string,
      keys: { p256dh: row.p256dh as string, auth: row.auth as string },
    }
    try {
      await webpush.sendNotification(sub, payload, {
        TTL: 86400,
        urgency: 'high',
      })
      sent += 1
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode
      const body = (err as { body?: string })?.body
      if (status === 410 || status === 404) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      } else {
        const msg = typeof body === 'string' ? body.slice(0, 120) : String(status ?? err)
        errors.push(msg)
        console.warn('[push/webhook] webpush send:', status, body)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    ...(errors.length ? { partial_errors: errors.slice(0, 3) } : {}),
  })
}

/** Algunos monitores / configuraciones hacen GET para probar la URL. */
export async function GET() {
  const secret = process.env.PUSH_WEBHOOK_SECRET
  const vapid = Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  )
  return NextResponse.json({
    service: 'push-webhook',
    ready: Boolean(secret?.trim() && vapid),
    hint: 'POST con JSON de Supabase Database Webhook + header de secreto; procesa community_alert y community_alert_critical (ver PUSH_WEBHOOK_SETUP.md)',
  })
}
