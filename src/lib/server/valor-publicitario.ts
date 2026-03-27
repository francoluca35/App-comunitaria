/** Clave en public.app_config (jsonb numérico). */
export const VALOR_PUBLICITARIO_CONFIG_KEY = 'valor_publicitario' as const
/** Clave en public.app_config (jsonb numérico) para el espacio lateral. */
export const VALOR_PUBLICITARIO_LATERAL_CONFIG_KEY = 'valor_publicitario_lateral' as const

export function parseValorPublicitarioJsonb(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(',', '.'))
    if (Number.isFinite(n) && n >= 0) return n
  }
  return 0
}
