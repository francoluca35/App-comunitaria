import type { PostMediaItem } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import { compressImageForVentaUpload } from '@/lib/compress-upload-image'
import { uploadImageWithThumbnail } from '@/lib/storage-thumbnail'

/**
 * Sube una sola imagen de publicación de venta (≤ 1 MB).
 */
export async function uploadVentaImage(
  userId: string,
  file: File,
  bucket = 'publicaciones'
): Promise<PostMediaItem> {
  const compressed = await compressImageForVentaUpload(file)
  const supabase = createClient()
  const { url, thumbUrl } = await uploadImageWithThumbnail(supabase, bucket, userId, compressed)
  return {
    url,
    thumbUrl,
    type: 'image',
  }
}
