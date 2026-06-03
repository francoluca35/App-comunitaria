-- El autor puede editar su publicación (texto, contacto, venta) sin cambiar el estado de moderación.

drop policy if exists "Authors can update own pending posts" on public.posts;

create policy "Authors can update own posts" on public.posts
	for update using (auth.uid() = author_id)
	with check (auth.uid() = author_id);

create or replace function public.posts_preserve_status_for_author_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if auth.uid() is not null
		and auth.uid() = old.author_id
		and not app_private.is_post_staff() then
		new.status := old.status;
		new.category := old.category;
		new.proposed_category_label := old.proposed_category_label;
		new.author_id := old.author_id;
	end if;
	new.updated_at := now();
	return new;
end;
$$;

drop trigger if exists posts_author_edit_preserve on public.posts;
create trigger posts_author_edit_preserve
	before update on public.posts
	for each row execute function public.posts_preserve_status_for_author_edit();
