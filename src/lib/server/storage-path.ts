export function publicStoragePathFromUrl(url: string, bucket: string): string | null {
	try {
		const parsed = new URL(url)
		const prefix = `/storage/v1/object/public/${bucket}/`
		const index = parsed.pathname.indexOf(prefix)
		if (index === -1) return null
		const path = decodeURIComponent(parsed.pathname.slice(index + prefix.length))
		return path && !path.includes('..') ? path : null
	} catch {
		return null
	}
}

export function publicStoragePathsFromUrls(urls: string[], bucket: string): string[] {
	return [...new Set(urls.map((url) => publicStoragePathFromUrl(url, bucket)).filter((path): path is string => Boolean(path)))]
}
