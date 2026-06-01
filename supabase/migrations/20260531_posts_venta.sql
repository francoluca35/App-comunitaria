-- Categoría Venta: subcategoría y precio definidos por el vecino; moderación aparte.

alter table public.posts
	add column if not exists sale_subcategory text,
	add column if not exists sale_price text;

insert into public.post_categories (slug, label, sort_order)
values ('venta', 'Venta', 6)
on conflict (slug) do update
	set label = excluded.label,
		sort_order = excluded.sort_order;
