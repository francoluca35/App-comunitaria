/** Palabras separadas por espacios (trim, minúsculas). */
export function searchTokens(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0)
}

/** Cada token tiene que aparecer en `haystack` (sin importar orden). */
export function matchesAllTokens(haystack: string, query: string): boolean {
  const tokens = searchTokens(query)
  if (tokens.length === 0) return true
  const h = haystack.toLowerCase()
  return tokens.every((t) => h.includes(t))
}

export function matchesPostSearch(
  post: { title: string; description: string; authorName: string },
  query: string
): boolean {
  const hay = `${post.title}\n${post.description}\n${post.authorName}`
  return matchesAllTokens(hay, query)
}

export function matchesPublicidadSearch(
  p: { title: string; description: string; category: string },
  query: string,
  categoryLabel?: string
): boolean {
  const hay = `${p.title}\n${p.description}\n${p.category}\n${categoryLabel ?? ''}`
  return matchesAllTokens(hay, query)
}
