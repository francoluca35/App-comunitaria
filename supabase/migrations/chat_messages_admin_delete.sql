-- Permite que los admins borren mensajes del chat (para vaciar conversaciones o por rango de fechas).
-- Requiere que exista la función current_user_is_admin() (ver fix_profiles_rls_500.sql).
create policy "Admins can delete any chat message"
  on public.chat_messages for delete
  using (public.current_user_is_admin());
