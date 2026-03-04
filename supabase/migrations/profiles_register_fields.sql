-- Campos extra para registro: fecha nacimiento, teléfono, provincia, localidad
-- Ejecutar en Supabase → SQL Editor (solo si ya corriste schema.sql)

alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists phone text,
  add column if not exists province text,
  add column if not exists locality text;

-- Actualizar trigger para guardar estos datos al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, status, birth_date, phone, province, locality)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'viewer',
    'active',
    (new.raw_user_meta_data->>'birth_date')::date,
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    nullif(trim(new.raw_user_meta_data->>'province'), ''),
    nullif(trim(new.raw_user_meta_data->>'locality'), '')
  );
  return new;
end;
$$ language plpgsql security definer;
