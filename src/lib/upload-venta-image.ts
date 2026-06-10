import type { PostMediaItem } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { compressImageForVentaUpload, storageExtensionFromFile } from '@/lib/compress-upload-image'
import { buildSupabasePublicStorageUrl } from '@/lib/storage-image'

/**
 * Sube una sola imagen de publicación de venta (≤ 1 MB).
 */
export async function uploadVentaImage(
  userId: string,
  file: File,
  bucket = 'publicaciones'
): Promise<PostMediaItem> {
  const compressed = await compressImageForVentaUpload(file)
  const ext = storageExtensionFromFile(compressed)
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
    upsert: false,
    contentType: compressed.type || 'image/jpeg',
  })
  if (error) throw error
  return {
    url: buildSupabasePublicStorageUrl(bucket, path),
    type: 'image',
  }
}
