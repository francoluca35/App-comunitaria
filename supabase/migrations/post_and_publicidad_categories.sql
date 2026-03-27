-- Categorías editables: publicaciones y publicidad (dos tablas independientes; los slugs no deben reutilizarse entre ambas).
-- Ejecutar en Supabase → SQL Editor (después de schema.sql)

-- Tabla categorías de publicaciones (slug = valor en posts.category)
create table if not exists public.post_categories (
  slug text primary key,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.post_categories (slug, label, sort_order) values
  ('mascotas', 'Mascotas', 1),
  ('alertas', 'Alertas', 2),
  ('avisos', 'Avisos', 3),
  ('objetos', 'Objetos', 4),
  ('noticias', 'Noticias', 5)
on conflict (slug) do nothing;

-- Tabla categorías de publicidad (filtros / UI; datos demo siguen usando estos slugs)
create table if not exists public.publicidad_categories (
  slug text primary key,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.publicidad_categories (slug, label, sort_order) values
  ('servicios', 'Servicios', 1),
  ('ventas', 'Ventas', 2),
  ('alquileres', 'Alquileres', 3),
  ('trabajo', 'Trabajo', 4),
  ('otros', 'Otros', 5)
on conflict (slug) do nothing;

alter table public.post_categories enable row level security;
alter table public.publicidad_categories enable row level security;

create policy "Anyone can read post_categories"
  on public.post_categories for select using (true);

create policy "Anyone can read publicidad_categories"
  on public.publicidad_categories for select using (true);

create policy "Admins insert post_categories"
  on public.post_categories for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins update post_categories"
  on public.post_categories for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins delete post_categories"
  on public.post_categories for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins insert publicidad_categories"
  on public.publicidad_categories for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins update publicidad_categories"
  on public.publicidad_categories for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins delete publicidad_categories"
  on public.publicidad_categories for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Reemplazar check fijo de posts.category por FK a post_categories
alter table public.posts drop constraint if exists posts_category_check;
alter table public.posts drop constraint if exists posts_category_fkey;

alter table public.posts
  add constraint posts_category_fkey
  foreign key (category) references public.post_categories(slug)
  on update cascade
  on delete restrict;
