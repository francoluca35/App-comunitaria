-- Bucket público para audios de chat (mensajes de voz).
-- Rutas: {auth.uid()}/{uuid}.webm

insert into storage.buckets (id, name, public)
values ('chat-audio', 'chat-audio', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read chat-audio" on storage.objects;
create policy "Public read chat-audio"
  on storage.objects for select
  using (bucket_id = 'chat-audio');

drop policy if exists "Users upload chat-audio to own folder" on storage.objects;
create policy "Users upload chat-audio to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-audio'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own chat-audio" on storage.objects;
create policy "Users delete own chat-audio"
  on storage.objects for delete
  using (
    bucket_id = 'chat-audio'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
