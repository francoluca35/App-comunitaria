-- Categoría puente para publicaciones "texto libre": el vecino propone el nombre;
-- al aprobar, staff crea la categoría real y asigna el post.
-- También: moderadores pueden leer/actualizar posts como los admins (moderación).

alter table public.posts
  add column if not exists proposed_category_label text;

comment on column public.posts.proposed_category_label is
  'Nombre de categoría sugerido por el autor; solo si category = propuesta. Se borra al aprobar y crear la categoría.';

insert into public.post_categories (slug, label, sort_order) values
  ('propuesta', 'Nueva categoría (pendiente)', 99)
on conflict (slug) do nothing;

-- Reemplazar políticas de posts: staff = admin + moderator
drop policy if exists "Admins can read all posts" on public.posts;
create policy "Staff can read all posts" on public.posts
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'moderator')
    )
  );

drop policy if exists "Admins can update any post (approve/reject)" on public.posts;
create policy "Staff can update any post (moderation)" on public.posts
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'moderator')
    )
  );

-- Moderadores pueden crear categorías de publicaciones (aprobación texto libre)
create policy "Moderators insert post_categories" on public.post_categories
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'moderator'
    )
  );
