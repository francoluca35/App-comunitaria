import imageCompression from 'browser-image-compression'
import { MEDIA_UPLOAD_LIMITS, assertStoredMediaLimit } from '@/lib/media-upload-limits'

/**
 * Reduce peso y tamaño en píxeles de fotos antes de subirlas a Storage.
 * En las pantallas de publicación el vecino puede elegir hasta varias fotos de hasta 5 MB c/u;
 * acá se comprimen para que ocupen mucho menos en el bucket.
 * Objetivo típico: ~0,5–1 MB por imagen en lugar de 3–5 MB de cámara, sin pérdida visible en el feed.
 * No usar Supabase /render/image/ al mostrar: la compresión al subir reemplaza las transformaciones en servidor.
 *
 * - Máximo ~2048 px en el lado mayor (suficiente para pantallas y zoom).
 * - Tamaño objetivo por archivo <= 1.5 MB (itera calidad/dimensiones dentro de la librería).
 * - Web Worker: no bloquea el hilo principal tanto como el canvas inline.
 * - SVG y GIF no se tocan (vectorial / animación).
 */
const MAX_WIDTH_OR_HEIGHT = 2048
const MAX_SIZE_MB = MEDIA_UPLOAD_LIMITS.maxStoredBytes / (1024 * 1024)
/** Archivos ya livianos: evita trabajo innecesario */
const SKIP_IF_NOT_LARGER_THAN_BYTES = 120_000
const AVATAR_MAX_WIDTH_OR_HEIGHT = 512

export async function compressImageForCommunityUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.size > MEDIA_UPLOAD_LIMITS.maxImageInputBytes) {
    throw new Error(`${file.name} supera ${MEDIA_UPLOAD_LIMITS.maxImageInputMbLabel}`)
  }
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    assertStoredMediaLimit(file, file.name)
    return file
  }
  if (file.size <= SKIP_IF_NOT_LARGER_THAN_BYTES) return file

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
      useWebWorker: true,
    })
    assertStoredMediaLimit(compressed, file.name)
    return compressed
  } catch {
    assertStoredMediaLimit(file, file.name)
    return file
  }
}

export async function compressImagesForCommunityUpload(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImageForCommunityUpload(f)))
}

/** Venta: una foto, máximo 1 MB (entrada hasta 5 MB). */
export async function compressImageForVentaUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.size > MEDIA_UPLOAD_LIMITS.maxImageInputBytes) {
    throw new Error(`${file.name} supera ${MEDIA_UPLOAD_LIMITS.maxImageInputMbLabel}`)
  }
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    if (file.size > MEDIA_UPLOAD_LIMITS.ventaMaxStoredBytes) {
      throw new Error(`${file.name} supera ${MEDIA_UPLOAD_LIMITS.ventaMaxStoredMbLabel}`)
    }
    return file
  }
  const maxMb = MEDIA_UPLOAD_LIMITS.ventaMaxStoredBytes / (1024 * 1024)
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: maxMb,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
    })
    if (compressed.size > MEDIA_UPLOAD_LIMITS.ventaMaxStoredBytes) {
      throw new Error(`${file.name} debe pesar ${MEDIA_UPLOAD_LIMITS.ventaMaxStoredMbLabel} o menos`)
    }
    return compressed
  } catch (err) {
    if (err instanceof Error && err.message.includes('debe pesar')) throw err
    if (file.size > MEDIA_UPLOAD_LIMITS.ventaMaxStoredBytes) {
      throw new Error(`${file.name} debe pesar ${MEDIA_UPLOAD_LIMITS.ventaMaxStoredMbLabel} o menos`)
    }
    return file
  }
}

/** Avatares: recorte cuadrado + compresión hasta ≤ 1.5 MB (entrada hasta 5 MB). */
export async function compressAvatarForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.size > MEDIA_UPLOAD_LIMITS.maxImageInputBytes) {
    throw new Error(`La imagen supera ${MEDIA_UPLOAD_LIMITS.maxImageInputMbLabel}`)
  }
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    assertStoredMediaLimit(file, 'La imagen')
    return file
  }
  if (file.size <= SKIP_IF_NOT_LARGER_THAN_BYTES) {
    assertStoredMediaLimit(file, 'La imagen')
    return file
  }
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: AVATAR_MAX_WIDTH_OR_HEIGHT,
      useWebWorker: true,
    })
    assertStoredMediaLimit(compressed, 'La imagen')
    return compressed
  } catch {
    assertStoredMediaLimit(file, 'La imagen')
    return file
  }
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
