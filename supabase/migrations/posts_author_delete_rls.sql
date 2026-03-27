-- Autores pueden eliminar sus propias publicaciones.
-- CASCADE borra post_media y comments: hacen falta políticas DELETE para el autor en esas tablas.

create policy "Authors can delete own posts" on public.posts
  for delete using (auth.uid() = author_id);

create policy "Authors can delete media of own posts" on public.post_media
  for delete using (
    exists (
      select 1 from public.posts po
      where po.id = post_media.post_id and po.author_id = auth.uid()
    )
  );

create policy "Post authors can delete comments on their posts" on public.comments
  for delete using (
    exists (
      select 1 from public.posts po
      where po.id = comments.post_id and po.author_id = auth.uid()
    )
  );
