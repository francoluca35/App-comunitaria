import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { VALOR_PUBLICITARIO_LATERAL_CONFIG_KEY } from '@/lib/server/valor-publicitario'

const MAX_VALOR = 999_999_999.99

function badBody() {
  return NextResponse.json(
    { error: 'Enviá un número mayor o igual a 0 en valorPublicitarioLateral' },
    { status: 400 }
  )
}

/** PATCH: actualizar precio de referencia lateral { valorPublicitarioLateral: number } */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  let body: { valorPublicitarioLateral?: unknown }
  try {
    body = await request.json()
  } catch {
    return badBody()
  }

  const raw = body.valorPublicitarioLateral
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw.replace(',', '.')) : NaN
  if (!Number.isFinite(n) || n < 0 || n > MAX_VALOR) return badBody()

  const { error } = await auth.supabase.from('app_config').upsert(
    {
      key: VALOR_PUBLICITARIO_LATERAL_CONFIG_KEY,
      value: n,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, valorPublicitarioLateral: n })
}

