-- ============================================
-- Supabase Storage – Configuración completa
-- Bucket: publicaciones (imágenes de publicaciones)
-- ============================================
--
-- IMPORTANTE: Si las imágenes no cargan en la página (403 o imagen rota),
-- el bucket debe ser PÚBLICO. Revisá en el Dashboard:
--
-- PASO 1 – Crear el bucket en el Dashboard (no se puede por SQL):
--   1. Ir a https://supabase.com/dashboard → tu proyecto
--   2. Storage → New bucket (o editar el bucket "publicaciones" si ya existe)
--   3. Name: publicaciones
--   4. Public bucket: DEBE ESTAR ACTIVADO (para que las URLs carguen sin auth)
--   5. Create bucket (o Save)
--
-- PASO 2 – Ejecutar este archivo en SQL Editor (Storage → Policies o SQL Editor)
-- ============================================

-- Quitar políticas anteriores si existen (para poder re-ejecutar el script)
drop policy if exists "Public read for publicaciones" on storage.objects;
drop policy if exists "Authenticated can upload to publicaciones" on storage.objects;
drop policy if exists "Users can upload to own folder publicaciones" on storage.objects;
drop policy if exists "Users can delete own uploads" on storage.objects;

-- --------------------------------------------
-- Lectura: cualquiera puede ver (bucket público)
-- Las URLs serán del tipo: https://xxx.supabase.co/storage/v1/object/public/publicaciones/userId/archivo.jpg
-- --------------------------------------------
create policy "Public read for publicaciones"
on storage.objects for select
using (bucket_id = 'publicaciones');

-- --------------------------------------------
-- Subida: solo usuarios autenticados y solo en su carpeta
-- Ruta obligatoria: {auth.uid()}/lo-que-sea (ej: userId/abc123.jpg)
-- Así cada usuario solo sube a su propia carpeta.
-- --------------------------------------------
create policy "Users can upload to own folder publicaciones"
on storage.objects for insert
with check (
  bucket_id = 'publicaciones'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- --------------------------------------------
-- Eliminar: solo el dueño puede borrar (archivos en su carpeta)
-- --------------------------------------------
create policy "Users can delete own uploads"
on storage.objects for delete
using (
  bucket_id = 'publicaciones'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- --------------------------------------------
-- Opcional: actualizar metadata (por si se usa después)
-- --------------------------------------------
create policy "Users can update own uploads in publicaciones"
on storage.objects for update
using (
  bucket_id = 'publicaciones'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- Uso desde la app
-- ============================================
-- Ruta de subida: {userId}/{uuid}.{ext}   ej: a1b2c3.../f47ac10b-58cc.jpg
-- URL pública:   {SUPABASE_URL}/storage/v1/object/public/publicaciones/{userId}/{uuid}.{ext}
-- La app debe subir con: supabase.storage.from('publicaciones').upload(path, file, { upsert: false })
-- y guardar en post_media la URL que devuelve .getPublicUrl() o la URL pública construida.
