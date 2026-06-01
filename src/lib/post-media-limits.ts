import { MEDIA_UPLOAD_LIMITS } from '@/lib/media-upload-limits'

/**
 * Límites de adjuntos en publicaciones vecinales (pantallas crear/otro y crear/animales).
 * En el cliente cada foto puede pesar hasta maxImageMbPerFile; al subir se comprimen
 * (ver compress-upload-image) para ocupar menos espacio en Storage.
 */
export const POST_MEDIA_LIMITS = {
  /** Máximo de fotos por publicación (cada una ≤ maxImageMbPerFile). Otras categorías (avisos, objetos, etc.). */
  maxImagesPerPost: 5,
  /** Mascotas (crear/animales, perdí o encontré): una sola foto, sin videos. */
  maxImagesMascotas: 1,
  /** Alertas (crear/alerta): máximo de fotos y de videos. */
  maxImagesAlertas: 3,
  maxVideosAlertas: 2,
  /** Noticias (crear/otro?categoria=noticias): máximo de fotos y de videos. */
  maxImagesNoticias: 2,
  maxVideosNoticias: 1,
  /** Tamaño máximo por archivo de imagen antes de comprimir (MB). */
  maxImageMbPerFile: MEDIA_UPLOAD_LIMITS.maxImageInputBytes / (1024 * 1024),
  maxVideosPerPost: 2,
  /** Tamaño máximo de video antes de comprimir; el archivo final debe quedar <= 1.5 MB. */
  maxVideoMbPerFile: MEDIA_UPLOAD_LIMITS.maxVideoInputBytes / (1024 * 1024),
  maxStoredMbPerFile: MEDIA_UPLOAD_LIMITS.maxStoredBytes / (1024 * 1024),
} as const
