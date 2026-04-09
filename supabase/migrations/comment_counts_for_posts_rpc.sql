-- Agregación de conteos de comentarios por publicación (evita traer una fila por comentario desde el cliente).
-- La app llama: supabase.rpc('comment_counts_for_posts', { p_post_ids: uuid[] })

CREATE OR REPLACE FUNCTION public.comment_counts_for_posts(p_post_ids uuid[])
RETURNS TABLE (post_id uuid, comment_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT c.post_id, COUNT(*)::bigint AS comment_count
  FROM public.comments c
  WHERE c.post_id = ANY(p_post_ids)
  GROUP BY c.post_id;
$$;

COMMENT ON FUNCTION public.comment_counts_for_posts(uuid[]) IS
  'Devuelve cantidad de comentarios por post_id para los UUID pedidos. Posts sin comentarios no aparecen (el cliente asume 0).';

GRANT EXECUTE ON FUNCTION public.comment_counts_for_posts(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.comment_counts_for_posts(uuid[]) TO authenticated;
