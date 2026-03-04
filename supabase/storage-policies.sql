-- Políticas de Storage para el bucket "publicaciones"
-- Antes: crear el bucket en Dashboard → Storage → New bucket
--   Nombre: publicaciones   |   Public: sí

-- Lectura: todos pueden ver (bucket público)
create policy "Public read for publicaciones"
on storage.objects for select
using (bucket_id = 'publicaciones');

-- Subida: solo usuarios autenticados
create policy "Authenticated can upload to publicaciones"
on storage.objects for insert
with check (bucket_id = 'publicaciones' and auth.role() = 'authenticated');

-- Eliminar: el dueño del archivo (path: author_id/filename)
create policy "Users can delete own uploads"
on storage.objects for delete
using (
  bucket_id = 'publicaciones'
  and (storage.foldername(name))[1] = auth.uid()::text
);
