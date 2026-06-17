-- Limpieza horaria de publicidades vencidas (filas en DB; respaldo del cleanup en la app).
-- La app también borra filas + imágenes en Storage como máximo cada 30 min (activos, mis publicidades).
create or replace function public.cleanup_expired_publicidad_rows()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	deleted_count integer := 0;
begin
	if to_regclass('public.publicidad_requests') is null then
		return 0;
	end if;

	with expired as (
		select id
		from public.publicidad_requests
		where status = 'active'
			and end_at is not null
			and end_at <= now()
	)
	delete from public.publicidad_requests
	where id in (select id from expired);

	get diagnostics deleted_count = row_count;
	return coalesce(deleted_count, 0);
end;
$$;

revoke all on function public.cleanup_expired_publicidad_rows() from public;
grant execute on function public.cleanup_expired_publicidad_rows() to postgres, service_role;

do $do$
declare
	job_id bigint;
begin
	if not exists (select 1 from pg_extension where extname = 'pg_cron') then
		raise notice 'pg_cron no disponible: omitiendo schedule. Usá /api/cron/cleanup-publicidad con CRON_SECRET.';
		return;
	end if;

	select jobid into job_id from cron.job where jobname = 'cleanup-expired-publicidad-rows' limit 1;
	if job_id is not null then
		perform cron.unschedule(job_id);
	end if;

	perform cron.schedule(
		'cleanup-expired-publicidad-rows',
		'15 * * * *',
		'select public.cleanup_expired_publicidad_rows();'
	);
end $do$;
