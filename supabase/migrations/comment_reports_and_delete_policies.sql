-- Comentarios: permitir borrado por autor del comentario, autor del post y admin.
-- Además, agregar reportes de comentarios con notificación a administradores.

drop policy if exists "Authors can delete own comments" on public.comments;
create policy "Authors can delete own comments" on public.comments
	for delete using (auth.uid() = author_id);

drop policy if exists "Post authors can delete comments on their posts" on public.comments;
create policy "Post authors can delete comments on their posts" on public.comments
	for delete using (
		exists (
			select 1
			from public.posts po
			where po.id = comments.post_id
			and po.author_id = auth.uid()
		)
	);

drop policy if exists "Admins can delete any comment" on public.comments;
create policy "Admins can delete any comment" on public.comments
	for delete using (public.current_user_is_admin());

create table if not exists public.comment_reports (
	id uuid primary key default gen_random_uuid(),
	comment_id uuid not null references public.comments(id) on delete cascade,
	post_id uuid not null references public.posts(id) on delete cascade,
	reporter_id uuid not null references public.profiles(id) on delete cascade,
	reason text,
	created_at timestamptz not null default now(),
	unique (comment_id, reporter_id)
);

create index if not exists idx_comment_reports_comment_id on public.comment_reports(comment_id);
create index if not exists idx_comment_reports_post_id on public.comment_reports(post_id);
create index if not exists idx_comment_reports_reporter_id on public.comment_reports(reporter_id);

alter table public.comment_reports enable row level security;

drop policy if exists "Authenticated can report comments" on public.comment_reports;
create policy "Authenticated can report comments" on public.comment_reports
	for insert with check (auth.uid() = reporter_id);

drop policy if exists "Admins can read comment reports" on public.comment_reports;
create policy "Admins can read comment reports" on public.comment_reports
	for select using (public.current_user_is_admin());

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
			'community_alert_critical',
			'publicidad_pending',
			'publicidad_payment_link',
			'publicidad_rejected',
			'publicidad_active',
			'publicidad_comment',
			'comment_report'
		)
	);

create or replace function public.notify_on_comment_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	r record;
	reporter_name text;
begin
	select name
	into reporter_name
	from public.profiles
	where id = new.reporter_id;

	for r in
		select p.id
		from public.profiles p
		where p.role in ('admin', 'admin_master')
		and coalesce(p.status, 'active') <> 'blocked'
	loop
		insert into public.notifications (user_id, type, title, body, link_url, related_id)
		values (
			r.id,
			'comment_report',
			'Comentario reportado',
			coalesce(nullif(trim(reporter_name), ''), 'Un usuario') || ' reportó un comentario.',
			'/post/' || new.post_id::text,
			new.comment_id::text
		);
	end loop;

	return new;
end;
$$;

drop trigger if exists on_comment_report_notify on public.comment_reports;
create trigger on_comment_report_notify
	after insert on public.comment_reports
	for each row execute function public.notify_on_comment_report();
