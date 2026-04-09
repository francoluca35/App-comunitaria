/** Filas devueltas por `public.comment_counts_for_posts(uuid[])`. */
export type CommentCountForPostRow = { post_id: string; comment_count: number | string }

export function commentCountsFromRpcRows(rows: unknown): Record<string, number> {
  const merged: Record<string, number> = {}
  if (!Array.isArray(rows)) return merged
  for (const row of rows as CommentCountForPostRow[]) {
    merged[String(row.post_id)] = Number(row.comment_count)
  }
  return merged
}
