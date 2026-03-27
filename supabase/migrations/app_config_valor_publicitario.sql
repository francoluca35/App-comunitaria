-- Valor publicitario (precio de referencia) en app_config + permisos admin para escribir config
-- Ejecutar en Supabase → SQL Editor si ya tenés schema.sql aplicado

insert into public.app_config (key, value) values ('valor_publicitario', '0'::jsonb)
on conflict (key) do nothing;

drop policy if exists "Admins can insert app_config" on public.app_config;
drop policy if exists "Admins can update app_config" on public.app_config;

create policy "Admins can insert app_config"
  on public.app_config for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update app_config"
  on public.app_config for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
