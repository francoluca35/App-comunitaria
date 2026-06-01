-- Alinea el CHECK de notifications.type con los tipos que usa la app.
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
				'comment_report'
			)
		);
end $$;
