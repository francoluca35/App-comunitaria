import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HTTP_CACHE_PUBLIC_SHORT } from '@/lib/server/http-cache'
import { VALOR_PUBLICITARIO_LATERAL_CONFIG_KEY, parseValorPublicitarioJsonb } from '@/lib/server/valor-publicitario'

/** GET: valor publicitario lateral (lectura pública). Si falta la fila o hay error, devuelve 0. */
export async function GET() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', VALOR_PUBLICITARIO_LATERAL_CONFIG_KEY)
      .maybeSingle()
    if (error) {
      console.error('GET valor_publicitario_lateral:', error)
      return NextResponse.json({ valorPublicitarioLateral: 0 }, { headers: HTTP_CACHE_PUBLIC_SHORT })
    }
    const valorPublicitarioLateral = parseValorPublicitarioJsonb(data?.value)
    return NextResponse.json({ valorPublicitarioLateral }, { headers: HTTP_CACHE_PUBLIC_SHORT })
  } catch (e) {
    console.error('GET valor_publicitario_lateral:', e)
    return NextResponse.json({ valorPublicitarioLateral: 0 }, { headers: HTTP_CACHE_PUBLIC_SHORT })
  }
}

