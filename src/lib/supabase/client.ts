import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let browserClient: SupabaseClient | null = null

/** Un solo cliente en el navegador para evitar "Multiple GoTrueClient instances". En SSR devuelve una instancia nueva por request. */
export function createClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    if (!browserClient) browserClient = createSupabaseClient(supabaseUrl, supabaseAnonKey)
    return browserClient
  }
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}
