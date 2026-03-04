-- ============================================
-- 2 cuentas de prueba: 1 admin, 1 viewer
-- Ejecutar en Supabase → SQL Editor
-- ============================================
-- IMPORTANTE: Insertar usuarios directo en auth.users suele dar 500 al hacer
-- login porque el hash de contraseña no coincide con el que usa Supabase.
-- MEJOR: crear los usuarios desde la app (Registrarse) o desde
-- Supabase → Authentication → Users → Add user (contraseña: Password123!)
-- y luego ejecutar solo el UPDATE de abajo para dar rol admin a admin@comunidad.com.
--
-- Si aun así querés usar este script, contraseña para ambos: Password123!
--   admin@comunidad.com / Password123!
--   viewer@comunidad.com / Password123!

create extension if not exists "pgcrypto";

-- ---------- 1) Admin ----------
do $$
declare
  v_admin_id uuid := gen_random_uuid();
  v_pw text := crypt('Password123!', gen_salt('bf'));
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@comunidad.com',
    v_pw,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin Comunidad","birth_date":"1990-01-15","phone":"11 1234-5678","province":"Buenos Aires","locality":"CABA"}'::jsonb,
    now(),
    now()
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    v_admin_id,
    v_admin_id,
    format('{"sub": "%s", "email": "admin@comunidad.com"}', v_admin_id)::jsonb,
    'email',
    v_admin_id,
    now(),
    now(),
    now()
  );

  insert into public.profiles (id, email, name, role, status, birth_date, phone, province, locality)
  values (
    v_admin_id,
    'admin@comunidad.com',
    'Admin Comunidad',
    'admin',
    'active',
    '1990-01-15'::date,
    '11 1234-5678',
    'Buenos Aires',
    'CABA'
  )
  on conflict (id) do update set
    role = 'admin',
    name = 'Admin Comunidad',
    birth_date = '1990-01-15'::date,
    phone = '11 1234-5678',
    province = 'Buenos Aires',
    locality = 'CABA';
end $$;

-- ---------- 2) Viewer ----------
do $$
declare
  v_viewer_id uuid := gen_random_uuid();
  v_pw text := crypt('Password123!', gen_salt('bf'));
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    v_viewer_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'viewer@comunidad.com',
    v_pw,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Usuario Visualizador","birth_date":"1995-05-20","phone":"11 9876-5432","province":"Santa Fe","locality":"Rosario"}'::jsonb,
    now(),
    now()
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    v_viewer_id,
    v_viewer_id,
    format('{"sub": "%s", "email": "viewer@comunidad.com"}', v_viewer_id)::jsonb,
    'email',
    v_viewer_id,
    now(),
    now(),
    now()
  );

  insert into public.profiles (id, email, name, role, status, birth_date, phone, province, locality)
  values (
    v_viewer_id,
    'viewer@comunidad.com',
    'Usuario Visualizador',
    'viewer',
    'active',
    '1995-05-20'::date,
    '11 9876-5432',
    'Santa Fe',
    'Rosario'
  )
  on conflict (id) do update set
    role = 'viewer',
    name = 'Usuario Visualizador',
    birth_date = '1995-05-20'::date,
    phone = '11 9876-5432',
    province = 'Santa Fe',
    locality = 'Rosario';
end $$;

-- Asegurar que el admin tenga role admin (por si el trigger creó el perfil antes)
update public.profiles set role = 'admin' where email = 'admin@comunidad.com';

-- ============================================
-- Si creaste usuarios desde Dashboard o desde la app (Registrarse),
-- ejecutá solo esto para dar rol admin a admin@comunidad.com:
--   update public.profiles set role = 'admin' where email = 'admin@comunidad.com';
-- ============================================
