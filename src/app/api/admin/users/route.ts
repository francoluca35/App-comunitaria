import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

/** Columnas base que siempre existen en profiles. Las extra (birth_date, phone, etc.) se agregan si existen. */
const BASE_SELECT = 'id, email, name, avatar_url, role, status, created_at, updated_at'

/** GET: lista de todos los perfiles (solo admin). Usa el cliente con token del admin + RLS "Admins can read all profiles". */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { supabase } = auth
    const { data: withExtra, error: errExtra } = await supabase
      .from('profiles')
      .select(BASE_SELECT + ', birth_date, phone, province, locality, suspended_until')
      .order('created_at', { ascending: false })
    if (!errExtra) {
      return NextResponse.json(withExtra ?? [])
    }
    const { data, error } = await supabase
      .from('profiles')
      .select(BASE_SELECT)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('GET /api/admin/users:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  } catch (e) {
    console.error('GET /api/admin/users:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error del servidor' },
      { status: 500 }
    )
  }
}
