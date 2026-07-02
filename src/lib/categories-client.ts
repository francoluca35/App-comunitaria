import type { SupabaseClient } from '@supabase/supabase-js'
import {
	DEFAULT_POST_CATEGORIES,
	DEFAULT_PUBLICIDAD_CATEGORIES,
	sanitizeCategoryRows,
	type NamedCategoryRow,
} from '@/lib/category-defaults'
import { isMissingCategoriesTable } from '@/lib/server/categories-table-error'

async function fetchCategoryTable(
	supabase: SupabaseClient,
	table: 'post_categories' | 'publicidad_categories',
	fallback: NamedCategoryRow[]
): Promise<NamedCategoryRow[]> {
	const { data, error } = await supabase
		.from(table)
		.select('slug,label,sort_order')
		.order('sort_order', { ascending: true })

	if (error) {
		if (isMissingCategoriesTable(error)) return fallback
		return fallback
	}

	const cleaned = sanitizeCategoryRows(data)
	return cleaned.length > 0 ? cleaned : fallback
}

export async function fetchPostCategoriesClient(supabase: SupabaseClient): Promise<NamedCategoryRow[]> {
	return fetchCategoryTable(supabase, 'post_categories', DEFAULT_POST_CATEGORIES)
}

export async function fetchPublicidadCategoriesClient(
	supabase: SupabaseClient
): Promise<NamedCategoryRow[]> {
	return fetchCategoryTable(supabase, 'publicidad_categories', DEFAULT_PUBLICIDAD_CATEGORIES)
}
