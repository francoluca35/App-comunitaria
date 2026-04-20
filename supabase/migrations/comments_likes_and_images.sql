-- Comentarios: imagen opcional + likes por usuario

alter table if exists public.comments
	add column if not exists image_url text;

create table if not exists public.comment_likes (
	comment_id uuid not null references public.comments(id) on delete cascade,
	user_id uuid not null references public.profiles(id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (comment_id, user_id)
);

create index if not exists idx_comment_likes_comment on public.comment_likes(comment_id);
create index if not exists idx_comment_likes_user on public.comment_likes(user_id);

alter table public.comment_likes enable row level security;

drop policy if exists "Anyone can read comment likes on approved posts" on public.comment_likes;
create policy "Anyone can read comment likes on approved posts" on public.comment_likes
	for select using (
		exists (
			select 1
			from public.comments c
			join public.posts p on p.id = c.post_id
			where c.id = comment_likes.comment_id
			and p.status = 'approved'
		)
	);

drop policy if exists "Authenticated can like comments" on public.comment_likes;
create policy "Authenticated can like comments" on public.comment_likes
	for insert with check (auth.uid() = user_id);

drop policy if exists "Users can remove own comment likes" on public.comment_likes;
create policy "Users can remove own comment likes" on public.comment_likes
	for delete using (auth.uid() = user_id);
