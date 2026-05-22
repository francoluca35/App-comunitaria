-- Permitir que cada usuario elimine sus propias notificaciones (vaciar bandeja)

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications" on public.notifications
	for delete
	using (user_id = auth.uid());
