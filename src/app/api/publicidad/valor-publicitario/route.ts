import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HTTP_CACHE_PUBLIC_SHORT } from '@/lib/server/http-cache'
import { VALOR_PUBLICITARIO_CONFIG_KEY, parseValorPublicitarioJsonb } from '@/lib/server/valor-publicitario'

/** GET: valor publicitario (lectura pública). Si falta la fila o hay error, devuelve 0. */
export async function GET() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', VALOR_PUBLICITARIO_CONFIG_KEY)
      .maybeSingle()
    if (error) {
      console.error('GET valor_publicitario:', error)
      return NextResponse.json({ valorPublicitario: 0 }, { headers: HTTP_CACHE_PUBLIC_SHORT })
    }
    const valorPublicitario = parseValorPublicitarioJsonb(data?.value)
    return NextResponse.json({ valorPublicitario }, { headers: HTTP_CACHE_PUBLIC_SHORT })
  } catch (e) {
    console.error('GET valor_publicitario:', e)
    return NextResponse.json({ valorPublicitario: 0 }, { headers: HTTP_CACHE_PUBLIC_SHORT })
  }
}
