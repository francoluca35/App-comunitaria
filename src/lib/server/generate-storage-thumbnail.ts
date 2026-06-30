import sharp from 'sharp'
import { THUMB_MAX_WIDTH_OR_HEIGHT } from '@/lib/storage-thumbnail'

/** Genera miniatura WebP en servidor (misma intención que generateImageThumbnail en cliente). */
export async function generateStorageThumbnailWebp(source: Buffer): Promise<Buffer> {
	return sharp(source)
		.rotate()
		.resize(THUMB_MAX_WIDTH_OR_HEIGHT, THUMB_MAX_WIDTH_OR_HEIGHT, {
			fit: 'inside',
			withoutEnlargement: true,
		})
		.webp({ quality: 78 })
		.toBuffer()
}
