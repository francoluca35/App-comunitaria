-- Rompe la recursión RLS entre profiles y otras tablas (posts, comments, publicidad, etc.):
-- cualquier policy que haga EXISTS (SELECT ... FROM profiles) al evaluar posts/comments
-- vuelve a disparar las policies de profiles (incl. lectura pública de autores/comentadores).
-- Igual que fix_profiles_rls_500.sql: helpers SECURITY DEFINER + row_security off.

-- ---------------------------------------------------------------------------
-- Funciones de rol (una sola lectura a profiles, sin RLS)
-- ---------------------------------------------------------------------------

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_user_is_staff()
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'moderator')
  );
$$;

create or replace function public.current_user_is_moderator()
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'moderator'
  );
$$;

grant execute on function public.current_user_is_admin() to anon, authenticated;
grant execute on function public.current_user_is_staff() to anon, authenticated;
grant execute on function public.current_user_is_moderator() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" on public.profiles
  for select using (public.current_user_is_admin());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ---------------------------------------------------------------------------
-- posts (nombres legacy + actuales)
-- ---------------------------------------------------------------------------

drop policy if exists "Staff can read all posts" on public.posts;
drop policy if exists "Admins can read all posts" on public.posts;
create policy "Staff can read all posts" on public.posts
  for select using (public.current_user_is_staff());

drop policy if exists "Staff can update any post (moderation)" on public.posts;
drop policy if exists "Admins can update any post (approve/reject)" on public.posts;
create policy "Staff can update any post (moderation)" on public.posts
  for update using (public.current_user_is_staff())
  with check (public.current_user_is_staff());

drop policy if exists "Admins can delete posts" on public.posts;
create policy "Admins can delete posts" on public.posts
  for delete using (public.current_user_is_admin());

-- ---------------------------------------------------------------------------
-- post_media
-- ---------------------------------------------------------------------------

drop policy if exists "Read media of visible posts" on public.post_media;
create policy "Read media of visible posts" on public.post_media
  for select using (
    exists (
      select 1 from public.posts po
      where po.id = post_media.post_id
        and (
          po.status = 'approved'
          or po.author_id = auth.uid()
          or public.current_user_is_staff()
        )
    )
  );

drop policy if exists "Admins can delete any media" on public.post_media;
create policy "Admins can delete any media" on public.post_media
  for delete using (public.current_user_is_admin());

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

drop policy if exists "Admins can delete any comment" on public.comments;
create policy "Admins can delete any comment" on public.comments
  for delete using (public.current_user_is_admin());

-- ---------------------------------------------------------------------------
-- publicidad_requests
-- ---------------------------------------------------------------------------

drop policy if exists "Admins can read all publicidad_requests" on public.publicidad_requests;
create policy "Admins can read all publicidad_requests" on public.publicidad_requests
  for select using (public.current_user_is_staff());

drop policy if exists "Admins can update publicidad_requests" on public.publicidad_requests;
create policy "Admins can update publicidad_requests"
  on public.publicidad_requests for update
  using (public.current_user_is_staff())
  with check (public.current_user_is_staff());

-- ---------------------------------------------------------------------------
-- app_config
-- ---------------------------------------------------------------------------

drop policy if exists "Admins can insert app_config" on public.app_config;
drop policy if exists "Admins can update app_config" on public.app_config;

create policy "Admins can insert app_config"
  on public.app_config for insert
  with check (public.current_user_is_admin());

create policy "Admins can update app_config"
  on public.app_config for update
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ---------------------------------------------------------------------------
-- post_categories / publicidad_categories
-- ---------------------------------------------------------------------------

drop policy if exists "Admins insert post_categories" on public.post_categories;
drop policy if exists "Admins update post_categories" on public.post_categories;
drop policy if exists "Admins delete post_categories" on public.post_categories;

create policy "Admins insert post_categories"
  on public.post_categories for insert
  with check (public.current_user_is_admin());

create policy "Admins update post_categories"
  on public.post_categories for update
  using (public.current_user_is_admin());

create policy "Admins delete post_categories"
  on public.post_categories for delete
  using (public.current_user_is_admin());

drop policy if exists "Admins insert publicidad_categories" on public.publicidad_categories;
drop policy if exists "Admins update publicidad_categories" on public.publicidad_categories;
drop policy if exists "Admins delete publicidad_categories" on public.publicidad_categories;

create policy "Admins insert publicidad_categories"
  on public.publicidad_categories for insert
  with check (public.current_user_is_admin());

create policy "Admins update publicidad_categories"
  on public.publicidad_categories for update
  using (public.current_user_is_admin());

create policy "Admins delete publicidad_categories"
  on public.publicidad_categories for delete
  using (public.current_user_is_admin());

drop policy if exists "Moderators insert post_categories" on public.post_categories;
create policy "Moderators insert post_categories"
  on public.post_categories for insert
  with check (public.current_user_is_moderator());
