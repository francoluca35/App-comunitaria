-- Reacciones simples en publicaciones: Me gusta / Me encanta.
create table if not exists public.post_reactions (
	id uuid primary key default gen_random_uuid(),
	post_id uuid not null references public.posts(id) on delete cascade,
	user_id uuid not null references public.profiles(id) on delete cascade,
	reaction_type text not null check (reaction_type in ('like', 'love')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (post_id, user_id)
);

create index if not exists idx_post_reactions_post on public.post_reactions(post_id);
create index if not exists idx_post_reactions_user on public.post_reactions(user_id);

alter table public.post_reactions enable row level security;

drop policy if exists "Read reactions of visible posts" on public.post_reactions;
create policy "Read reactions of visible posts" on public.post_reactions
	for select using (
		exists (
			select 1
			from public.posts po
			where po.id = post_reactions.post_id
				and (
					po.status = 'approved'
					or po.author_id = auth.uid()
					or app_private.is_post_staff()
				)
		)
	);

drop policy if exists "Authenticated can react to visible posts" on public.post_reactions;
create policy "Authenticated can react to visible posts" on public.post_reactions
	for insert with check (
		auth.uid() = user_id
		and exists (
			select 1
			from public.posts po
			where po.id = post_reactions.post_id
				and (
					po.status = 'approved'
					or po.author_id = auth.uid()
					or app_private.is_post_staff()
				)
		)
	);

drop policy if exists "Users can update own post reactions" on public.post_reactions;
create policy "Users can update own post reactions" on public.post_reactions
	for update using (auth.uid() = user_id)
	with check (auth.uid() = user_id);

drop policy if exists "Users can delete own post reactions" on public.post_reactions;
create policy "Users can delete own post reactions" on public.post_reactions
	for delete using (auth.uid() = user_id);
