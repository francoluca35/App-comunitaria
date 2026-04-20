-- Comentarios para publicidades + notificación al dueño al recibir comentario nuevo.

create table if not exists public.publicidad_comments (
	id uuid primary key default gen_random_uuid(),
	publicidad_id uuid not null references public.publicidad_requests(id) on delete cascade,
	author_id uuid not null references public.profiles(id) on delete cascade,
	text text not null check (char_length(trim(text)) > 0),
	created_at timestamptz not null default now()
);

create index if not exists idx_publicidad_comments_publicidad on public.publicidad_comments(publicidad_id, created_at);
create index if not exists idx_publicidad_comments_author on public.publicidad_comments(author_id);

alter table public.publicidad_comments enable row level security;

drop policy if exists "Anyone can read comments on active publicidades" on public.publicidad_comments;
create policy "Anyone can read comments on active publicidades"
	on public.publicidad_comments for select
	using (
		exists (
			select 1
			from public.publicidad_requests pr
			where pr.id = publicidad_comments.publicidad_id
				and pr.status = 'active'
				and (pr.end_at is null or pr.end_at > now())
		)
	);

drop policy if exists "Authenticated can insert publicidad comments" on public.publicidad_comments;
create policy "Authenticated can insert publicidad comments"
	on public.publicidad_comments for insert
	with check (
		auth.uid() = author_id
		and exists (
			select 1
			from public.publicidad_requests pr
			where pr.id = publicidad_comments.publicidad_id
				and pr.status = 'active'
				and (pr.end_at is null or pr.end_at > now())
		)
	);

drop policy if exists "Authors can delete own publicidad comments" on public.publicidad_comments;
create policy "Authors can delete own publicidad comments"
	on public.publicidad_comments for delete
	using (auth.uid() = author_id);

alter table public.notifications
	drop constraint if exists notifications_type_check;

alter table public.notifications
	add constraint notifications_type_check
	check (
		type in (
			'message',
			'comment',
			'post_approved',
			'post_rejected',
			'post_deleted',
			'post_pending',
			'new_profile',
			'community_alert',
			'publicidad_pending',
			'publicidad_payment_link',
			'publicidad_rejected',
			'publicidad_active',
			'publicidad_comment'
		)
	);

create or replace function public.notify_on_publicidad_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	publicidad_owner_id uuid;
	commenter_name text;
begin
	select owner_id
	into publicidad_owner_id
	from public.publicidad_requests
	where id = new.publicidad_id;

	if publicidad_owner_id is null or publicidad_owner_id = new.author_id then
		return new;
	end if;

	select name
	into commenter_name
	from public.profiles
	where id = new.author_id;

	insert into public.notifications (user_id, type, title, body, link_url, related_id)
	values (
		publicidad_owner_id,
		'publicidad_comment',
		'Nuevo comentario en tu publicidad',
		coalesce(trim(commenter_name), 'Alguien') || ' comentó en tu publicidad',
		'/cartelera',
		new.publicidad_id::text
	);

	return new;
end;
$$;

drop trigger if exists on_publicidad_comment_notify on public.publicidad_comments;
create trigger on_publicidad_comment_notify
	after insert on public.publicidad_comments
	for each row execute function public.notify_on_publicidad_comment();

alter publication supabase_realtime add table public.publicidad_comments;
