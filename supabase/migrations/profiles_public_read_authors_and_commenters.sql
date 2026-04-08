-- Permitir lectura pública de nombre/avatar para:
-- 1) autores de posts aprobados (feed / detalle ya muestran al autor)
-- 2) quienes comentaron en posts aprobados (lista de comentarios visible sin sesión)
--
-- Las subconsultas directas a posts/comments desde una policy en profiles provocan
-- recursión infinita: las policies de posts consultan profiles (staff/admin). Se usan
-- funciones SECURITY DEFINER con row_security off para comprobar existencia sin re-entrar en RLS.

drop policy if exists "Anyone can read profile of author of approved posts" on public.profiles;
drop policy if exists "Anyone can read profile of commenters on approved posts" on public.profiles;

create or replace function public.profile_is_author_of_approved_post(profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select exists (
    select 1 from public.posts po
    where po.author_id = profile_id and po.status = 'approved'
  );
$$;

create or replace function public.profile_commented_on_approved_post(profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select exists (
    select 1
    from public.comments c
    inner join public.posts p on p.id = c.post_id and p.status = 'approved'
    where c.author_id = profile_id
  );
$$;

grant execute on function public.profile_is_author_of_approved_post(uuid) to anon, authenticated;
grant execute on function public.profile_commented_on_approved_post(uuid) to anon, authenticated;

create policy "Anyone can read profile of author of approved posts"
  on public.profiles for select
  using (public.profile_is_author_of_approved_post(profiles.id));

create policy "Anyone can read profile of commenters on approved posts"
  on public.profiles for select
  using (public.profile_commented_on_approved_post(profiles.id));
