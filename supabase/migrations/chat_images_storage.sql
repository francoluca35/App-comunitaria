-- Bucket público para fotos en mensajes de chat.
-- Rutas: {auth.uid()}/{uuid}.{jpg|png|webp}

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read chat-images" on storage.objects;
create policy "Public read chat-images"
  on storage.objects for select
  using (bucket_id = 'chat-images');

drop policy if exists "Users upload chat-images to own folder" on storage.objects;
create policy "Users upload chat-images to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own chat-images" on storage.objects;
create policy "Users delete own chat-images"
  on storage.objects for delete
  using (
    bucket_id = 'chat-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
