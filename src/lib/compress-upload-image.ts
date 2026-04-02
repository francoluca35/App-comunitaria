import imageCompression from 'browser-image-compression'

/**
 * Reduce peso y tamaño en píxeles de fotos antes de subirlas a Storage.
 * En las pantallas de publicación el vecino puede elegir hasta varias fotos de hasta 5 MB c/u;
 * acá se comprimen para que ocupen mucho menos en el bucket.
 * Objetivo típico: ~0,5–1 MB por imagen en lugar de 3–5 MB de cámara, sin pérdida visible en el feed.
 *
 * - Máximo ~2048 px en el lado mayor (suficiente para pantallas y zoom).
 * - Tamaño objetivo por archivo ~0,9 MB (itera calidad/dimensiones dentro de la librería).
 * - Web Worker: no bloquea el hilo principal tanto como el canvas inline.
 * - SVG y GIF no se tocan (vectorial / animación).
 */
const MAX_WIDTH_OR_HEIGHT = 2048
const MAX_SIZE_MB = 0.9
/** Archivos ya livianos: evita trabajo innecesario */
const SKIP_IF_NOT_LARGER_THAN_BYTES = 120_000

export async function compressImageForCommunityUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file
  if (file.size <= SKIP_IF_NOT_LARGER_THAN_BYTES) return file

  try {
    return await imageCompression(file, {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
      useWebWorker: true,
    })
  } catch {
    return file
  }
}

export async function compressImagesForCommunityUpload(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImageForCommunityUpload(f)))
}

export function storageExtensionFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 5) return fromName
  const t = file.type
  if (t === 'image/jpeg' || t === 'image/jpg') return 'jpg'
  if (t === 'image/png') return 'png'
  if (t === 'image/webp') return 'webp'
  if (t === 'image/gif') return 'gif'
  return 'jpg'
}
