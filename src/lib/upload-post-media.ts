import type { PostMediaItem } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { compressImagesForCommunityUpload, storageExtensionFromFile } from '@/lib/compress-upload-image'

export type LocalAttachment = { file: File; kind: 'image' | 'video' }

/** Extensión del nombre de archivo (sin punto), minúsculas. */
export function fileExtensionLower(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? ''
  const i = base.lastIndexOf('.')
  if (i < 0) return ''
  return base.slice(i + 1).toLowerCase()
}

const VIDEO_EXT_ALLOW = new Set(['mp4', 'mov', 'webm', 'm4v', '3gp', '3g2'])

export function storageExtensionFromVideoFile(file: File): string {
  const ext = fileExtensionLower(file.name)
  if (ext === 'webm') return 'webm'
  if (ext === 'mov' || ext === 'qt') return 'mov'
  if (ext === 'm4v') return 'm4v'
  if (ext === '3gp' || ext === '3g2') return ext
  const t = file.type
  if (t === 'video/quicktime') return 'mov'
  if (t === 'video/webm') return 'webm'
  return 'mp4'
}

/** Content-Type razonable para Storage cuando el navegador no informa MIME (común en Windows). */
export function postVideoContentType(file: File): string {
  if (file.type && file.type.startsWith('video/')) return file.type
  const ext = fileExtensionLower(file.name)
  if (ext === 'mov' || ext === 'qt') return 'video/quicktime'
  if (ext === 'webm') return 'video/webm'
  if (ext === '3gp') return 'video/3gpp'
  if (ext === '3g2') return 'video/3gpp2'
  return 'video/mp4'
}

/** MIME `video/*` (vacío en algunos SO → usar `isAllowedPostVideoFile`). */
export function isAllowedPostVideoMime(mime: string): boolean {
  return Boolean(mime && mime.startsWith('video/'))
}

/** Acepta video por MIME o por extensión si el MIME viene vacío (típico en Chrome/Edge en Windows). */
export function isAllowedPostVideoFile(file: File): boolean {
  if (isAllowedPostVideoMime(file.type)) return true
  return VIDEO_EXT_ALLOW.has(fileExtensionLower(file.name))
}

/**
 * Sube fotos (comprimidas) y videos (sin re-encoding) en orden, mismo bucket que las publicaciones.
 */
export async function uploadLocalPostMedia(
  userId: string,
  attachments: LocalAttachment[],
  bucket = 'publicaciones'
): Promise<PostMediaItem[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) {
    throw new Error('Configuración de Storage no disponible')
  }
  const supabase = createClient()

  const imageInput = attachments.filter((a) => a.kind === 'image').map((a) => a.file)
  const compressedImages = await compressImagesForCommunityUpload(imageInput)

  const out: PostMediaItem[] = []
  let imgIdx = 0

  for (const att of attachments) {
    if (att.kind === 'image') {
      const file = compressedImages[imgIdx++]
      if (!file) continue
      const ext = storageExtensionFromFile(file)
      const path = `${userId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
        contentType: file.type || 'image/jpeg',
      })
      if (error) throw error
      out.push({
        url: `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${path}`,
        type: 'image',
      })
    } else {
      const file = att.file
      const ext = storageExtensionFromVideoFile(file)
      const path = `${userId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
        contentType: postVideoContentType(file),
      })
      if (error) throw error
      out.push({
        url: `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${path}`,
        type: 'video',
      })
    }
  }

  return out
}
