-- ============================================
-- Supabase – Esquema inicial Comunidad
-- SOLO para proyecto NUEVO (primera vez). Si la BD ya existe,
-- NO ejecutes este archivo entero: fallará con "policy already exists".
-- Para actualizar permisos, usá: supabase/migrations/*.sql
-- ============================================

-- Perfiles: rol y estado (vinculado a auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  role text not null default 'viewer' check (role in ('viewer', 'moderator', 'admin', 'admin_master')),
  status text not null default 'active' check (status in ('active', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_status on public.profiles(status);

-- Trigger: crear perfil al registrarse (role = viewer por defecto)
-- search_path fijo por Security Advisor (evita inyección de esquemas)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'viewer',
    'active'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Publicaciones
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  proposed_category_label text,
  sale_subcategory text,
  sale_price text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  whatsapp_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_author on public.posts(author_id);
create index if not exists idx_posts_status on public.posts(status);
create index if not exists idx_posts_category on public.posts(category);
create index if not exists idx_posts_created_at on public.posts(created_at desc);
create index if not exists idx_posts_status_created_at on public.posts(status, created_at desc);
create index if not exists idx_posts_author_status_created_at on public.posts(author_id, status, created_at desc);
create index if not exists idx_posts_author_created_at on public.posts(author_id, created_at desc);

-- URLs de medios (imágenes/videos) por publicación
create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  url text not null,
  type text not null check (type in ('image', 'video')),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_post_media_post on public.post_media(post_id);

-- Comentarios
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_post on public.comments(post_id);
create index if not exists idx_comments_author_created_at on public.comments(author_id, created_at desc);

-- Categorías dinámicas (slug en posts.category)
create table if not exists public.post_categories (
  slug text primary key,
  label text not null,
  sort_order int not null default 0
);

create table if not exists public.publicidad_categories (
  slug text primary key,
  label text not null,
  sort_order int not null default 0
);

insert into public.post_categories (slug, label, sort_order) values
  ('mascotas', 'Mascotas', 1),
  ('alertas', 'Alertas', 2),
  ('avisos', 'Avisos', 3),
  ('objetos', 'Objetos', 4),
  ('noticias', 'Noticias', 5),
  ('venta', 'Venta', 6),
  ('propuesta', 'Nueva categoría (pendiente)', 99)
on conflict (slug) do nothing;

insert into public.publicidad_categories (slug, label, sort_order) values
  ('servicios', 'Servicios', 1),
  ('ventas', 'Ventas', 2),
  ('alquileres', 'Alquileres', 3),
  ('trabajo', 'Trabajo', 4),
  ('otros', 'Otros', 5)
on conflict (slug) do nothing;
create index if not exists idx_comments_author on public.comments(author_id);

-- Configuración global (comentarios, WhatsApp, límites)
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value) values
  ('comments_enabled', 'true'),
  ('whatsapp_enabled', 'true'),
  ('max_posts_per_user', '5'),
  ('max_images_per_post', '5'),
  ('terms_of_service', '"Normas de uso de la plataforma."')
on conflict (key) do nothing;

-- ============================================
-- RLS (Row Level Security)
-- ============================================

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;
alter table public.app_config enable row level security;
alter table public.post_categories enable row level security;
alter table public.publicidad_categories enable row level security;

create schema if not exists app_private;

create or replace function app_private.is_post_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'admin_master', 'moderator')
  );
$$;

create or replace function app_private.is_post_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'admin_master')
  );
$$;

revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, anon;
grant execute on all functions in schema app_private to authenticated, anon;

create policy "Anyone can read post categories" on public.post_categories for select using (true);
create policy "Anyone can read publicidad categories" on public.publicidad_categories for select using (true);

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Staff can read all profiles" on public.profiles
  for select using (app_private.is_post_staff());

create policy "Read profiles of post authors" on public.profiles
  for select using (
    exists (
      select 1 from public.posts po
      where po.author_id = profiles.id
        and (po.status = 'approved' or po.author_id = auth.uid() or app_private.is_post_staff())
    )
  );

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Anyone can read approved posts" on public.posts
  for select using (status = 'approved');

create policy "Authors can read own posts" on public.posts
  for select using (auth.uid() = author_id);

create policy "Staff can read all posts" on public.posts
  for select using (app_private.is_post_staff());

create policy "Authenticated can create posts" on public.posts
  for insert with check (auth.uid() = author_id and auth.uid() is not null);

create policy "Authors can update own pending posts" on public.posts
  for update using (auth.uid() = author_id and status = 'pending');

create policy "Staff can update any post (approve/reject)" on public.posts
  for update using (app_private.is_post_staff());

create policy "Admins can delete posts" on public.posts
  for delete using (app_private.is_post_admin());

create policy "Authors can delete own posts" on public.posts
  for delete using (auth.uid() = author_id);

create policy "Read media of visible posts" on public.post_media
  for select using (
    exists (
      select 1 from public.posts po
      where po.id = post_media.post_id
        and (po.status = 'approved' or po.author_id = auth.uid() or app_private.is_post_staff())
    )
  );

create policy "Authors can insert media for own posts" on public.post_media
  for insert with check (
    exists (select 1 from public.posts po where po.id = post_media.post_id and po.author_id = auth.uid())
  );

create policy "Admins can delete any media" on public.post_media
  for delete using (app_private.is_post_admin());

create policy "Authors can delete media of own posts" on public.post_media
  for delete using (
    exists (
      select 1 from public.posts po
      where po.id = post_media.post_id and po.author_id = auth.uid()
    )
  );

create policy "Anyone can read comments of approved posts" on public.comments
  for select using (
    exists (select 1 from public.posts po where po.id = comments.post_id and po.status = 'approved')
  );

create policy "Staff can read comments for moderation" on public.comments
  for select using (app_private.is_post_staff());

create policy "Authenticated can comment" on public.comments
  for insert with check (auth.uid() = author_id);

create policy "Admins can delete any comment" on public.comments
  for delete using (app_private.is_post_admin());

create policy "Post authors can delete comments on their posts" on public.comments
  for delete using (
    exists (
      select 1 from public.posts po
      where po.id = comments.post_id and po.author_id = auth.uid()
    )
  );

create policy "Anyone can read config" on public.app_config
  for select using (true);

create or replace function public.comment_counts_for_posts(p_post_ids uuid[])
returns table (post_id uuid, comment_count bigint)
language sql stable security invoker set search_path = public
as $$
  select c.post_id, count(*)::bigint from public.comments c
  where c.post_id = any (p_post_ids) group by c.post_id;
$$;

grant execute on function public.comment_counts_for_posts(uuid[]) to anon, authenticated;
