import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type PublicidadStatus = 'pending' | 'payment_pending' | 'active' | 'rejected'

export interface MisPublicidadRow {
  id: string
  title: string
  description: string
  category: string
  images: string[]
  status: PublicidadStatus
  created_at: string
  start_at: string | null
  end_at: string | null
  payment_link_url: string | null
  days_left: number
}

function toIntDaysRemaining(endAtIso: string | null): number {
  if (!endAtIso) return 0
  const end = new Date(endAtIso)
  const now = new Date()
  const diffMs = end.getTime() - now.getTime()
  if (diffMs <= 0) return 0
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.ceil(diffMs / msPerDay)
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createClient(token)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)
  if (userError || !user?.id) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  const { data, error } = await supabase
    .from('publicidad_requests')
    .select(
      'id,title,description,category,images,status,created_at,start_at,end_at,payment_link_url'
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = new Date()
  const active: MisPublicidadRow[] = []
  const inactive: MisPublicidadRow[] = []

  for (const r of data ?? []) {
    const status = r.status as PublicidadStatus
    const days_left = status === 'active' ? toIntDaysRemaining(r.end_at) : 0

    const isActiveNow =
      status === 'active' &&
      r.end_at &&
      new Date(r.end_at).getTime() > now.getTime()

    const item: MisPublicidadRow = {
      id: String(r.id),
      title: String(r.title ?? ''),
      description: String(r.description ?? ''),
      category: String(r.category ?? 'otros'),
      images: Array.isArray(r.images) ? r.images.map((x: any) => String(x)) : [],
      status,
      created_at: String(r.created_at ?? ''),
      start_at: r.start_at ? String(r.start_at) : null,
      end_at: r.end_at ? String(r.end_at) : null,
      payment_link_url: r.payment_link_url ? String(r.payment_link_url) : null,
      days_left,
    }

    if (isActiveNow) active.push(item)
    else inactive.push(item)
  }

  return NextResponse.json({ active, inactive })
}

