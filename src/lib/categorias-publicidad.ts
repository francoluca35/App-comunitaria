/**
 * Categorías de publicidad (anuncios pagos / avisos clasificados).
 * Son independientes de las categorías de difusión (mascotas, alertas, avisos, etc.).
 * Se van agregando aquí a medida que se creen nuevas categorías de publicidad.
 */

export interface CategoriaPublicidad {
  value: string
  label: string
}

export const CATEGORIAS_PUBLICIDAD: CategoriaPublicidad[] = [
  { value: 'servicios', label: 'Servicios' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'alquileres', label: 'Alquileres' },
  { value: 'trabajo', label: 'Trabajo' },
  { value: 'otros', label: 'Otros' },
]

/** Opción "Todas" para el filtro */
export const OPCION_TODAS = { value: 'all', label: 'Todas las categorías' } as const
