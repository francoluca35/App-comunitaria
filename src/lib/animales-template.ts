/** Plantillas para publicaciones de mascotas (Fase B): texto fijo + campos mínimos. */

export type AnimalCaso = 'encontrado' | 'perdido'

export function referentFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName.trim() || 'Mario'
}

/** Fecha input type=date (yyyy-mm-dd) → texto legible para la publicación */
export function formatFechaAR(isoDate: string): string {
  const parts = isoDate.split('-').map((p) => parseInt(p, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate
  const [y, m, d] = parts
  return `${d}/${m}/${y}`
}

export function buildAnimalesDescription(params: {
  caso: AnimalCaso
  referente: string
  ubicacion: string
  fechaIso: string
  telefono: string
  /** Solo “Perdí”: texto único tras “responde a nombre de …” */
  respondeNombre?: string
}): string {
  const { caso, referente, ubicacion, fechaIso, telefono, respondeNombre } = params
  const fecha = formatFechaAR(fechaIso)
  const u = ubicacion.trim()
  const t = telefono.trim()
  if (caso === 'encontrado') {
    return `Hola ${referente}, encontré una mascota en ${u}, el ${fecha}. Buscamos al dueño o a la familia. Comunicarse al teléfono ${t}.`
  }
  const rn = (respondeNombre ?? '').trim()
  return `Hola ${referente}, perdí mi mascota responde a nombre de ${rn}. Última zona donde se la vio: ${u}, el ${fecha}. Comunicarse al teléfono ${t} si tenés novedades.`
}

export function buildAnimalesTitle(caso: AnimalCaso, ubicacion: string): string {
  const u = ubicacion.trim().slice(0, 48)
  const base = caso === 'encontrado' ? 'Mascota encontrada' : 'Mascota perdida'
  return u ? `${base} — ${u}` : base
}
