'use client'

import { useEffect, useState } from 'react'
import { ensureStorageObjectPublicUrl } from '@/lib/storage-image'
import { storagePreviewUrl } from '@/lib/storage-thumbnail'
import { cn } from '@/app/components/ui/utils'

type Props = {
	src: string
	alt?: string
	className?: string
	loading?: 'lazy' | 'eager'
	decoding?: 'async' | 'auto' | 'sync'
	onLoad?: () => void
	onError?: () => void
	/** Si true, no intenta miniatura (p. ej. lightbox). */
	fullResolution?: boolean
}

/**
 * Muestra miniatura en listados; si no existe (imágenes viejas), cae a la URL completa.
 */
export function PreviewStorageImage({
	src,
	alt = '',
	className,
	loading = 'lazy',
	decoding = 'async',
	onLoad,
	onError,
	fullResolution = false,
}: Props) {
	const full = ensureStorageObjectPublicUrl(src)
	const initial = fullResolution ? full : storagePreviewUrl(full)
	const [currentSrc, setCurrentSrc] = useState(initial)

	useEffect(() => {
		setCurrentSrc(fullResolution ? full : storagePreviewUrl(full))
	}, [full, fullResolution])

	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={currentSrc}
			alt={alt}
			className={cn(className)}
			loading={loading}
			decoding={decoding}
			onLoad={onLoad}
			onError={() => {
				if (currentSrc !== full) {
					setCurrentSrc(full)
					return
				}
				onError?.()
			}}
		/>
	)
}
