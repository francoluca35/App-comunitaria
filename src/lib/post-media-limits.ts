/**
 * Límites de adjuntos en publicaciones vecinales (pantallas crear/otro y crear/animales).
 * En el cliente cada foto puede pesar hasta maxImageMbPerFile; al subir se comprimen
 * (ver compress-upload-image) para ocupar menos espacio en Storage.
 */
export const POST_MEDIA_LIMITS = {
  /** Máximo de fotos por publicación (cada una ≤ maxImageMbPerFile). Otras categorías (avisos, objetos, etc.). */
  maxImagesPerPost: 5,
  /** Mascotas (crear/animales, perdí o encontré): máximo de fotos. */
  maxImagesMascotas: 3,
  /** Alertas (crear/alerta): máximo de fotos y de videos. */
  maxImagesAlertas: 3,
  maxVideosAlertas: 2,
  /** Noticias (crear/otro?categoria=noticias): máximo de fotos y de videos. */
  maxImagesNoticias: 2,
  maxVideosNoticias: 1,
  /** Tamaño máximo por archivo de imagen antes de comprimir (MB). */
  maxImageMbPerFile: 5,
  maxVideosPerPost: 2,
  maxVideoMbPerFile: 45,
} as const
