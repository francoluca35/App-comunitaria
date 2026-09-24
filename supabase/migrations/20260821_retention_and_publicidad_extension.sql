-- =============================================================================
-- RETENCIÓN PARA BAJAR CONSUMO (DB + STORAGE)
-- Pegá este script entero en el SQL Editor de Supabase y ejecutalo.
--
-- Borra lo que más pesa en Supabase:
-- 1) Chat > 2 días  → filas + archivos en chat-images / chat-audio
-- 2) Posts > 45 días → filas + imágenes/videos en publicaciones (+ thumbs)
-- 3) Publicidades vencidas (con oferta de extensión) → filas + imágenes
-- 4) Notificaciones > 30 días
-- 5) Presencia idle > 1 día
--
-- Si ya corriste la versión anterior, este script la REEMPLAZA (CREATE OR REPLACE).
-- =============================================================================

create extension if not exists pg_cron with schema pg_catalog;

-- -----------------------------------------------------------------------------
-- Helpers Storage: extraer path y borrar objetos (+ miniatura _thumb.webp)
-- -----------------------------------------------------------------------------
create or replace function public.storage_path_from_url(p_url text, p_bucket text)
returns text
language plpgsql
immutable
as $$
declare
	path_part text;
	marker text;
	idx int;
begin
	if p_url is null or length(trim(p_url)) = 0 or p_bucket is null then
		return null;
	end if;

	marker := '/storage/v1/object/public/' || p_bucket || '/';
	idx := position(marker in p_url);
	if idx = 0 then
		marker := '/storage/v1/render/image/public/' || p_bucket || '/';
		idx := position(marker in p_url);
	end if;
	if idx = 0 then
		return null;
	end if;

	path_part := substr(p_url, idx + length(marker));
	path_part := split_part(path_part, '?', 1);
	path_part := nullif(trim(both '/' from path_part), '');
	if path_part is null or path_part like '%..%' then
		return null;
	end if;
	return path_part;
end;
$$;

create or replace function public.storage_paths_with_thumb(p_path text)
returns text[]
language plpgsql
immutable
as $$
declare
	dir text;
	fname text;
	base text;
begin
	if p_path is null or length(p_path) = 0 then
		return array[]::text[];
	end if;
	if p_path like '%_thumb.webp' then
		return array[p_path];
	end if;

	if position('/' in p_path) > 0 then
		dir := regexp_replace(p_path, '/[^/]+$', '/');
		fname := regexp_replace(p_path, '^.*/', '');
	else
		dir := '';
		fname := p_path;
	end if;

	base := regexp_replace(fname, '\.[^.]+$', '');
	return array[p_path, dir || base || '_thumb.webp'];
end;
$$;

create or replace function public.delete_storage_urls(p_bucket text, p_urls text[])
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
	u text;
	p text;
	paths text[] := array[]::text[];
	extra text;
	deleted_count integer := 0;
begin
	if p_urls is null or p_bucket is null then
		return 0;
	end if;

	foreach u in array p_urls loop
		p := public.storage_path_from_url(u, p_bucket);
		if p is null then
			continue;
		end if;
		foreach extra in array public.storage_paths_with_thumb(p) loop
			paths := array_append(paths, extra);
		end loop;
	end loop;

	paths := (select array_agg(distinct x) from unnest(paths) as t(x) where x is not null);
	if paths is null or cardinality(paths) = 0 then
		return 0;
	end if;

	delete from storage.objects
	where bucket_id = p_bucket
		and name = any (paths);

	get diagnostics deleted_count = row_count;
	return coalesce(deleted_count, 0);
end;
$$;

revoke all on function public.delete_storage_urls(text, text[]) from public;
grant execute on function public.delete_storage_urls(text, text[]) to postgres, service_role;

-- -----------------------------------------------------------------------------
-- Columnas extensión publicidad
-- -----------------------------------------------------------------------------
do $$
begin
	if to_regclass('public.publicidad_requests') is null then
		return;
	end if;

	alter table public.publicidad_requests
		add column if not exists extension_offer_sent_at timestamptz,
		add column if not exists extension_response text,
		add column if not exists extension_responded_at timestamptz,
		add column if not exists extension_grace_until timestamptz;

	begin
		alter table public.publicidad_requests
			drop constraint if exists publicidad_requests_extension_response_check;
	exception when undefined_object then
		null;
	end;

	alter table public.publicidad_requests
		add constraint publicidad_requests_extension_response_check
		check (extension_response is null or extension_response in ('yes', 'no'));
end $$;

create index if not exists idx_publicidad_extension_offer
	on public.publicidad_requests (status, end_at)
	where status = 'active';

-- Notificación tipo extensión
do $$
declare
	constraint_name text;
begin
	if to_regclass('public.notifications') is null then
		return;
	end if;

	for constraint_name in
		select c.conname
		from pg_constraint c
		join pg_class t on t.oid = c.conrelid
		join pg_namespace n on n.oid = t.relnamespace
		where n.nspname = 'public'
			and t.relname = 'notifications'
			and c.contype = 'c'
			and pg_get_constraintdef(c.oid) ilike '%type%'
	loop
		execute format('alter table public.notifications drop constraint %I', constraint_name);
	end loop;

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
				'community_notice',
				'publicidad_pending',
				'publicidad_payment_link',
				'publicidad_rejected',
				'publicidad_active',
				'publicidad_comment',
				'publicidad_extend_offer',
				'comment_report'
			)
		);
end $$;

-- -----------------------------------------------------------------------------
-- Chat > 2 días (DB + Storage)
-- -----------------------------------------------------------------------------
create or replace function public.cleanup_old_chat_messages()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	batch_ids uuid[];
	img_urls text[];
	audio_urls text[];
	deleted_total integer := 0;
	n integer;
begin
	if to_regclass('public.chat_messages') is null then
		return 0;
	end if;

	loop
		select array_agg(id) into batch_ids
		from (
			select id
			from public.chat_messages
			where created_at < now() - interval '2 days'
			order by created_at asc
			limit 300
		) s;

		exit when batch_ids is null or cardinality(batch_ids) = 0;

		select
			coalesce(array_agg(url) filter (where url is not null and kind = 'image'), array[]::text[]),
			coalesce(array_agg(url) filter (where url is not null and kind = 'audio'), array[]::text[])
		into img_urls, audio_urls
		from (
			select
				case
					when m.content like '__CHAT_IMAGE__%' then 'image'
					when m.content like '__CHAT_AUDIO__%' then 'audio'
					else null
				end as kind,
				case
					when m.content like '__CHAT_IMAGE__%' then
						nullif((substring(m.content from length('__CHAT_IMAGE__') + 1)::jsonb ->> 'u'), '')
					when m.content like '__CHAT_AUDIO__%' then
						nullif((substring(m.content from length('__CHAT_AUDIO__') + 1)::jsonb ->> 'u'), '')
					else null
				end as url
			from public.chat_messages m
			where m.id = any (batch_ids)
				and (m.content like '__CHAT_IMAGE__%' or m.content like '__CHAT_AUDIO__%')
		) parsed;

		perform public.delete_storage_urls('chat-images', coalesce(img_urls, array[]::text[]));
		perform public.delete_storage_urls('chat-audio', coalesce(audio_urls, array[]::text[]));

		delete from public.chat_messages where id = any (batch_ids);
		get diagnostics n = row_count;
		deleted_total := deleted_total + coalesce(n, 0);

		exit when cardinality(batch_ids) < 300;
	end loop;

	return deleted_total;
exception
	when others then
		-- Si falla el parseo JSON de algún mensaje, igual borramos filas viejas
		delete from public.chat_messages where created_at < now() - interval '2 days';
		get diagnostics deleted_total = row_count;
		return coalesce(deleted_total, 0);
end;
$$;

revoke all on function public.cleanup_old_chat_messages() from public;
grant execute on function public.cleanup_old_chat_messages() to postgres, service_role;

-- -----------------------------------------------------------------------------
-- Posts > 45 días (DB + Storage publicaciones + thumbs + fotos de comentarios)
-- -----------------------------------------------------------------------------
create or replace function public.cleanup_old_posts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	batch_ids uuid[];
	media_urls text[];
	deleted_total integer := 0;
	n integer;
begin
	if to_regclass('public.posts') is null then
		return 0;
	end if;

	loop
		select array_agg(id) into batch_ids
		from (
			select id
			from public.posts
			where created_at < now() - interval '45 days'
			order by created_at asc
			limit 150
		) s;

		exit when batch_ids is null or cardinality(batch_ids) = 0;

		media_urls := array[]::text[];

		if to_regclass('public.post_media') is not null then
			select coalesce(array_agg(url), array[]::text[]) into media_urls
			from public.post_media
			where post_id = any (batch_ids)
				and url is not null;
		end if;

		if to_regclass('public.comments') is not null then
			select coalesce(media_urls, array[]::text[]) || coalesce(array_agg(image_url), array[]::text[])
			into media_urls
			from public.comments
			where post_id = any (batch_ids)
				and image_url is not null
				and length(trim(image_url)) > 0;
		end if;

		perform public.delete_storage_urls('publicaciones', coalesce(media_urls, array[]::text[]));

		delete from public.posts where id = any (batch_ids);
		get diagnostics n = row_count;
		deleted_total := deleted_total + coalesce(n, 0);

		exit when cardinality(batch_ids) < 150;
	end loop;

	return deleted_total;
end;
$$;

revoke all on function public.cleanup_old_posts() from public;
grant execute on function public.cleanup_old_posts() to postgres, service_role;

-- -----------------------------------------------------------------------------
-- Notificaciones viejas + presencia idle
-- -----------------------------------------------------------------------------
create or replace function public.cleanup_old_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	deleted_count integer := 0;
begin
	if to_regclass('public.notifications') is null then
		return 0;
	end if;

	delete from public.notifications
	where created_at < now() - interval '30 days';

	get diagnostics deleted_count = row_count;
	return coalesce(deleted_count, 0);
end;
$$;

revoke all on function public.cleanup_old_notifications() from public;
grant execute on function public.cleanup_old_notifications() to postgres, service_role;

create or replace function public.cleanup_stale_presence()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	deleted_count integer := 0;
begin
	if to_regclass('public.user_presence') is null then
		return 0;
	end if;

	delete from public.user_presence
	where last_seen_at < now() - interval '1 day';

	get diagnostics deleted_count = row_count;
	return coalesce(deleted_count, 0);
end;
$$;

revoke all on function public.cleanup_stale_presence() from public;
grant execute on function public.cleanup_stale_presence() to postgres, service_role;

-- -----------------------------------------------------------------------------
-- Ofertas de extensión publicidad
-- -----------------------------------------------------------------------------
create or replace function public.notify_publicidad_extension_offers()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	r record;
	notified_count integer := 0;
	grace_until timestamptz;
begin
	if to_regclass('public.publicidad_requests') is null then
		return 0;
	end if;

	for r in
		select id, owner_id, title, end_at
		from public.publicidad_requests
		where status = 'active'
			and end_at is not null
			and extension_offer_sent_at is null
			and end_at <= now() + interval '2 days'
	loop
		grace_until := greatest(r.end_at, now()) + interval '2 days';

		update public.publicidad_requests
		set
			extension_offer_sent_at = now(),
			extension_grace_until = grace_until
		where id = r.id;

		if to_regclass('public.notifications') is not null and r.owner_id is not null then
			insert into public.notifications (user_id, type, title, body, link_url, related_id)
			values (
				r.owner_id,
				'publicidad_extend_offer',
				'¿Desea extender la publicidad?',
				format(
					'Tu publicidad «%s» está por finalizar o ya venció. Entrá a Mis publicidades y elegí SI (abonar para continuar) o NO (se elimina). Tenés tiempo hasta %s.',
					coalesce(nullif(trim(r.title), ''), 'Publicidad'),
					to_char(grace_until at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI')
				),
				'/mis-publicidades',
				r.id::text
			);
		end if;

		notified_count := notified_count + 1;
	end loop;

	return notified_count;
end;
$$;

revoke all on function public.notify_publicidad_extension_offers() from public;
grant execute on function public.notify_publicidad_extension_offers() to postgres, service_role;

-- -----------------------------------------------------------------------------
-- SI / NO extensión (NO también borra Storage)
-- -----------------------------------------------------------------------------
create or replace function public.respond_publicidad_extension(
	p_publicidad_id uuid,
	p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_row public.publicidad_requests%rowtype;
	v_uid uuid := auth.uid();
	v_urls text[];
begin
	if v_uid is null then
		raise exception 'No autenticado';
	end if;

	select * into v_row
	from public.publicidad_requests
	where id = p_publicidad_id
	for update;

	if not found then
		raise exception 'Publicidad no encontrada';
	end if;

	if v_row.owner_id is distinct from v_uid then
		raise exception 'No sos el dueño de esta publicidad';
	end if;

	if v_row.status not in ('active', 'payment_pending') then
		raise exception 'La publicidad no admite extensión en este estado';
	end if;

	if p_accept is not true then
		begin
			select coalesce(array_agg(x), array[]::text[])
			into v_urls
			from unnest(coalesce(v_row.images, array[]::text[])) as t(x)
			where x is not null and length(trim(x)) > 0;
		exception when others then
			v_urls := array[]::text[];
		end;

		perform public.delete_storage_urls('publicaciones', coalesce(v_urls, array[]::text[]));

		if to_regclass('public.publicidad_comments') is not null then
			delete from public.publicidad_comments where publicidad_id = p_publicidad_id;
		end if;
		delete from public.publicidad_requests where id = p_publicidad_id;

		return jsonb_build_object('ok', true, 'action', 'deleted');
	end if;

	update public.publicidad_requests
	set
		extension_response = 'yes',
		extension_responded_at = now(),
		status = 'payment_pending',
		extension_grace_until = coalesce(extension_grace_until, now() + interval '2 days')
	where id = p_publicidad_id;

	if to_regclass('public.notifications') is not null then
		insert into public.notifications (user_id, type, title, body, link_url, related_id)
		values (
			v_uid,
			'publicidad_payment_link',
			'Extensión de publicidad: pendiente de pago',
			format(
				'Elegiste extender «%s». Completá el pago para que continúe activa. Si no abonás antes del plazo de gracia, se eliminará.',
				coalesce(nullif(trim(v_row.title), ''), 'Publicidad')
			),
			'/mis-publicidades',
			p_publicidad_id::text
		);
	end if;

	return jsonb_build_object('ok', true, 'action', 'payment_pending');
end;
$$;

revoke all on function public.respond_publicidad_extension(uuid, boolean) from public;
grant execute on function public.respond_publicidad_extension(uuid, boolean) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Publicidades vencidas (DB + Storage)
-- -----------------------------------------------------------------------------
create or replace function public.cleanup_expired_publicidad_rows()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	doomed_ids uuid[];
	img_urls text[];
	deleted_count integer := 0;
	r record;
begin
	if to_regclass('public.publicidad_requests') is null then
		return 0;
	end if;

	perform public.notify_publicidad_extension_offers();

	select array_agg(id) into doomed_ids
	from public.publicidad_requests
	where
		extension_response = 'no'
		or (
			end_at is not null
			and end_at <= now()
			and coalesce(extension_grace_until, end_at + interval '2 days') <= now()
			and status in ('active', 'payment_pending')
		)
		or (
			status = 'payment_pending'
			and extension_response = 'yes'
			and extension_grace_until is not null
			and extension_grace_until <= now()
		);

	if doomed_ids is null or cardinality(doomed_ids) = 0 then
		return 0;
	end if;

	img_urls := array[]::text[];
	for r in
		select images
		from public.publicidad_requests
		where id = any (doomed_ids)
	loop
		begin
			img_urls := img_urls || coalesce(
				array(
					select x
					from unnest(coalesce(r.images, array[]::text[])) as t(x)
					where x is not null and length(trim(x)) > 0
				),
				array[]::text[]
			);
		exception when others then
			null;
		end;
	end loop;

	perform public.delete_storage_urls('publicaciones', img_urls);

	if to_regclass('public.publicidad_comments') is not null then
		delete from public.publicidad_comments where publicidad_id = any (doomed_ids);
	end if;

	delete from public.publicidad_requests where id = any (doomed_ids);
	get diagnostics deleted_count = row_count;
	return coalesce(deleted_count, 0);
end;
$$;

revoke all on function public.cleanup_expired_publicidad_rows() from public;
grant execute on function public.cleanup_expired_publicidad_rows() to postgres, service_role;

-- -----------------------------------------------------------------------------
-- Mantenimiento unificado
-- -----------------------------------------------------------------------------
create or replace function public.run_retention_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	msgs integer := 0;
	posts_n integer := 0;
	pubs integer := 0;
	notifs integer := 0;
	presence_n integer := 0;
begin
	msgs := public.cleanup_old_chat_messages();
	posts_n := public.cleanup_old_posts();
	pubs := public.cleanup_expired_publicidad_rows();
	notifs := public.cleanup_old_notifications();
	presence_n := public.cleanup_stale_presence();
	return jsonb_build_object(
		'chat_messages_deleted', msgs,
		'posts_deleted', posts_n,
		'publicidades_deleted', pubs,
		'notifications_deleted', notifs,
		'presence_deleted', presence_n,
		'ran_at', now()
	);
end;
$$;

revoke all on function public.run_retention_maintenance() from public;
grant execute on function public.run_retention_maintenance() to postgres, service_role;

do $do$
declare
	job_id bigint;
begin
	if not exists (select 1 from pg_extension where extname = 'pg_cron') then
		raise notice 'pg_cron no disponible. Ejecutá manualmente: select public.run_retention_maintenance();';
		return;
	end if;

	for job_id in
		select jobid from cron.job
		where jobname in (
			'cleanup-expired-publicidad-rows',
			'retention-chat-posts-publicidad'
		)
	loop
		perform cron.unschedule(job_id);
	end loop;

	perform cron.schedule(
		'cleanup-expired-publicidad-rows',
		'20 * * * *',
		'select public.cleanup_expired_publicidad_rows();'
	);

	perform cron.schedule(
		'retention-chat-posts-publicidad',
		'15 6 * * *',
		'select public.run_retention_maintenance();'
	);
end $do$;

-- Prueba:
-- select public.run_retention_maintenance();
