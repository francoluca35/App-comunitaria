alter table public.profiles add column if not exists incognito_alias text;
alter table public.posts add column if not exists is_incognito boolean not null default false;
alter table public.posts add column if not exists incognito_alias text;
alter table public.comments add column if not exists is_incognito boolean not null default false;
alter table public.comments add column if not exists incognito_alias text;
