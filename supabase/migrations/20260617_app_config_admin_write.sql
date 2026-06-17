-- Permite que admins actualicen app_config (alias/CBU, valores publicitarios, etc.).
do $$
begin
	if to_regclass('public.app_config') is null then
		return;
	end if;

	if not exists (
		select 1 from pg_policies
		where schemaname = 'public'
			and tablename = 'app_config'
			and policyname = 'Admins can manage app config'
	) then
		create policy "Admins can manage app config" on public.app_config
			for all
			using (app_private.is_post_admin())
			with check (app_private.is_post_admin());
	end if;
end $$;
