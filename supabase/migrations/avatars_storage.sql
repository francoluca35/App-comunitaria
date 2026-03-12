-- ============================================
-- Supabase Storage – Bucket: avatars (fotos de perfil)
-- ============================================
--
-- PASO 1 – Crear el bucket en el Dashboard:
--   1. Storage → New bucket
--   2. Name: avatars
--   3. Public bucket: ACTIVADO (para que las URLs de avatar carguen sin auth)
--   4. Create bucket
--
-- PASO 2 – Ejecutar este archivo en SQL Editor
-- ============================================

drop policy if exists "Public read for avatars" on storage.objects;
drop policy if exists "Users can upload to own folder avatars" on storage.objects;
drop policy if exists "Users can update own avatars" on storage.objects;
drop policy if exists "Users can delete own avatars" on storage.objects;

-- Lectura: cualquiera puede ver (bucket público)
create policy "Public read for avatars"
on storage.objects for select
using (bucket_id = 'avatars');

-- Subida: solo autenticado y solo en su carpeta (avatars/{auth.uid()}/...)
create policy "Users can upload to own folder avatars"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Actualizar: solo el dueño
create policy "Users can update own avatars"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Eliminar: solo el dueño
create policy "Users can delete own avatars"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
