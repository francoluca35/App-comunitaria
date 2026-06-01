type StorageImageOptions = {
	width?: number
	height?: number
	quality?: number
	resize?: 'cover' | 'contain' | 'fill'
}

export function optimizedStorageImageUrl(url: string | null | undefined, options: StorageImageOptions = {}): string {
	if (!url) return ''
	try {
		const parsed = new URL(url)
		const marker = '/storage/v1/object/public/'
		const markerIndex = parsed.pathname.indexOf(marker)
		if (markerIndex === -1) return url

		const storagePath = parsed.pathname.slice(markerIndex + marker.length)
		if (!storagePath || storagePath.includes('..')) return url

		parsed.pathname = `/storage/v1/render/image/public/${storagePath}`
		parsed.search = ''
		if (options.width) parsed.searchParams.set('width', String(options.width))
		if (options.height) parsed.searchParams.set('height', String(options.height))
		if (options.quality) parsed.searchParams.set('quality', String(options.quality))
		if (options.resize) parsed.searchParams.set('resize', options.resize)
		return parsed.toString()
	} catch {
		return url
	}
}
