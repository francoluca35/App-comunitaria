-- Índices compuestos para feed, conteos y rate limits; RPC comment_counts; límites por minuto.

-- Feed público: status + created_at
create index if not exists idx_posts_status_created_at on public.posts(status, created_at desc);
create index if not exists idx_posts_author_status_created_at on public.posts(author_id, status, created_at desc);
create index if not exists idx_posts_author_created_at on public.posts(author_id, created_at desc);

-- Comentarios: conteos y rate limit por autor
create index if not exists idx_comments_author_created_at on public.comments(author_id, created_at desc);

-- Reacciones: rate limit por usuario
create index if not exists idx_post_reactions_user_created_at on public.post_reactions(user_id, created_at desc);

-- Publicidad activa (si existe la tabla)
do $$
begin
	if to_regclass('public.publicidad_requests') is not null then
		execute $idx$
			create index if not exists idx_publicidad_requests_active_end
				on public.publicidad_requests(status, end_at desc)
				where status = 'active'
		$idx$;
	end if;
end $$;

-- Notificaciones por usuario (si existe la tabla)
do $$
begin
	if to_regclass('public.notifications') is not null then
		execute $idx$
			create index if not exists idx_notifications_user_created_at
				on public.notifications(user_id, created_at desc)
		$idx$;
	end if;
end $$;

-- RPC de conteos (idempotente)
create or replace function public.comment_counts_for_posts(p_post_ids uuid[])
returns table (post_id uuid, comment_count bigint)
language sql stable security invoker set search_path = public
as $$
	select c.post_id, count(*)::bigint
	from public.comments c
	where c.post_id = any (p_post_ids)
	group by c.post_id;
$$;

grant execute on function public.comment_counts_for_posts(uuid[]) to anon, authenticated;

-- Rate limits: posts (5/min), comentarios (30/min), reacciones nuevas (60/min). Staff exento.

create or replace function public.enforce_post_insert_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	recent int;
begin
	if app_private.is_post_staff() then
		return new;
	end if;

	select count(*)::int into recent
	from public.posts
	where author_id = new.author_id
		and created_at > now() - interval '1 minute';

	if recent >= 5 then
		raise exception 'rate_limit:posts';
	end if;

	return new;
end;
$$;

drop trigger if exists trg_posts_insert_rate_limit on public.posts;
create trigger trg_posts_insert_rate_limit
	before insert on public.posts
	for each row execute function public.enforce_post_insert_rate_limit();

create or replace function public.enforce_comment_insert_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	recent int;
begin
	if app_private.is_post_staff() then
		return new;
	end if;

	select count(*)::int into recent
	from public.comments
	where author_id = new.author_id
		and created_at > now() - interval '1 minute';

	if recent >= 30 then
		raise exception 'rate_limit:comments';
	end if;

	return new;
end;
$$;

drop trigger if exists trg_comments_insert_rate_limit on public.comments;
create trigger trg_comments_insert_rate_limit
	before insert on public.comments
	for each row execute function public.enforce_comment_insert_rate_limit();

create or replace function public.enforce_post_reaction_insert_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	recent int;
begin
	if app_private.is_post_staff() then
		return new;
	end if;

	select count(*)::int into recent
	from public.post_reactions
	where user_id = new.user_id
		and created_at > now() - interval '1 minute';

	if recent >= 60 then
		raise exception 'rate_limit:reactions';
	end if;

	return new;
end;
$$;

drop trigger if exists trg_post_reactions_insert_rate_limit on public.post_reactions;
create trigger trg_post_reactions_insert_rate_limit
	before insert on public.post_reactions
	for each row execute function public.enforce_post_reaction_insert_rate_limit();
