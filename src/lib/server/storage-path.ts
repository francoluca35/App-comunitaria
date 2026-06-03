export function publicStoragePathFromUrl(url: string, bucket: string): string | null {
	try {
		const parsed = new URL(url)
		const prefixes = [
			`/storage/v1/object/public/${bucket}/`,
			`/storage/v1/render/image/public/${bucket}/`,
		]
		for (const prefix of prefixes) {
			const index = parsed.pathname.indexOf(prefix)
			if (index === -1) continue
			const path = decodeURIComponent(parsed.pathname.slice(index + prefix.length).split('?')[0])
			if (path && !path.includes('..')) return path
		}
		return null
	} catch {
		return null
	}
}

export function publicStoragePathsFromUrls(urls: string[], bucket: string): string[] {
	return [...new Set(urls.map((url) => publicStoragePathFromUrl(url, bucket)).filter((path): path is string => Boolean(path)))]
}
