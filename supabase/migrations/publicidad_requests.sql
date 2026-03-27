-- Publicidades: solicitudes (pending -> pago -> activa) + RLS + notificaciones
-- Ejecutar en Supabase → SQL Editor
-- Requiere: profiles table + notifications table + (ideal) publicidad_categories con slug 'otros'

-- ------------------------------------------------------------
-- Helper: updated_at genérico
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Tabla de solicitudes de publicidad
-- ------------------------------------------------------------
create table if not exists public.publicidad_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,

  title text not null,
  description text not null,
  phone_number text,
  instagram text,
  images text[] not null default '{}',

  -- Para compatibilidad con el filtro actual en /publicidades
  category text not null default 'otros',

  days_active int not null check (days_active > 0 and days_active <= 365),

  -- pending: esperando admin
  -- payment_pending: admin dio OK, falta que el dueño confirme el pago
  -- active: publicación activa
  -- rejected: rechazada por admin
  status text not null default 'pending'
    check (status in ('pending', 'payment_pending', 'active', 'rejected')),

  price_amount numeric not null default 0,

  payment_token text,
  payment_link_url text,
  start_at timestamptz,
  end_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_publicidad_requests_owner on public.publicidad_requests(owner_id);
create index if not exists idx_publicidad_requests_status on public.publicidad_requests(status);
create index if not exists idx_publicidad_requests_end_at on public.publicidad_requests(end_at);
create index if not exists idx_publicidad_requests_payment_token on public.publicidad_requests(payment_token);

drop trigger if exists publicidad_requests_set_updated_at on public.publicidad_requests;
create trigger publicidad_requests_set_updated_at
  before update on public.publicidad_requests
  for each row
  execute function public.set_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.publicidad_requests enable row level security;

-- Lectura pública: solo publicidades activas (vigentes)
create policy "Anyone can read active publicidades"
  on public.publicidad_requests for select
  using (
    status = 'active'
    and (end_at is null or end_at > now())
  );

-- Dueño puede leer sus solicitudes (pending / payment / etc.)
create policy "Owner can read own publicidad_requests"
  on public.publicidad_requests for select
  using (owner_id = auth.uid());

-- Admin puede leer todo
create policy "Admins can read all publicidad_requests"
  on public.publicidad_requests for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'moderator'))
  );

-- Dueño puede crear
create policy "Authenticated can insert publicidad_requests"
  on public.publicidad_requests for insert
  with check (
    owner_id = auth.uid()
  );

-- Admin/moderador puede actualizar estado + payment fields
create policy "Admins can update publicidad_requests"
  on public.publicidad_requests for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'moderator'))
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'moderator'))
  );

-- ------------------------------------------------------------
-- Notificaciones (security definer)
-- ------------------------------------------------------------
-- Cuando un usuario crea una solicitud pending -> avisar a admins/moderadores
create or replace function public.notify_on_publicidad_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_name text;
  r record;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select name into owner_name from public.profiles where id = new.owner_id;

  for r in
    select id from public.profiles where role in ('admin', 'moderator')
  loop
    insert into public.notifications (user_id, type, title, body, link_url, related_id)
    values (
      r.id,
      'publicidad_pending',
      'Solicitud de publicidad',
      coalesce(trim(owner_name), 'Alguien') || ' solicitó una publicidad - revisá',
      '/admin/publicidades',
      new.id::text
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists on_publicidad_pending_notify on public.publicidad_requests;
create trigger on_publicidad_pending_notify
  after insert on public.publicidad_requests
  for each row
  execute function public.notify_on_publicidad_pending();

-- Cuando cambia status -> avisar al dueño
create or replace function public.notify_on_publicidad_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  -- A pago pendiente: enviar link de pago
  if new.status = 'payment_pending' then
    insert into public.notifications (user_id, type, title, body, link_url, related_id)
    values (
      new.owner_id,
      'publicidad_payment_link',
      'Tu publicidad está lista para pagar',
      'Ingresá al link y confirmá el pago para activar tu publicidad.',
      new.payment_link_url,
      new.id::text
    );

  -- Rechazada
  elsif new.status = 'rejected' then
    insert into public.notifications (user_id, type, title, body, link_url, related_id)
    values (
      new.owner_id,
      'publicidad_rejected',
      'Publicidad rechazada',
      'Tu solicitud de publicidad no fue aprobada. Podés volver a enviarla con cambios.',
      null,
      new.id::text
    );

  -- Activa
  elsif new.status = 'active' then
    insert into public.notifications (user_id, type, title, body, link_url, related_id)
    values (
      new.owner_id,
      'publicidad_active',
      'Publicidad activa',
      'Tu publicidad ya está visible en la comunidad.',
      '/publicidades',
      new.id::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_publicidad_status_notify on public.publicidad_requests;
create trigger on_publicidad_status_notify
  after update on public.publicidad_requests
  for each row
  execute function public.notify_on_publicidad_status_change();

