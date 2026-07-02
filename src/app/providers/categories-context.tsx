'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
	DEFAULT_POST_CATEGORIES,
	DEFAULT_PUBLICIDAD_CATEGORIES,
	type NamedCategoryRow,
} from '@/lib/category-defaults'
import { fetchPostCategoriesClient, fetchPublicidadCategoriesClient } from '@/lib/categories-client'
import type { CategoriesContextType } from '@/app/providers/types'

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined)

export function CategoriesProvider({ children }: { children: ReactNode }) {
	const supabase = useMemo(() => createClient(), [])
	const [postCategories, setPostCategories] = useState<NamedCategoryRow[]>(DEFAULT_POST_CATEGORIES)
	const [publicidadCategories, setPublicidadCategories] =
		useState<NamedCategoryRow[]>(DEFAULT_PUBLICIDAD_CATEGORIES)

	const refreshPostCategories = useCallback(async () => {
		try {
			const cleaned = await fetchPostCategoriesClient(supabase)
			if (cleaned.length > 0) setPostCategories(cleaned)
		} catch {
			// mantener defaults
		}
	}, [supabase])

	const refreshPublicidadCategories = useCallback(async () => {
		try {
			const cleaned = await fetchPublicidadCategoriesClient(supabase)
			if (cleaned.length > 0) setPublicidadCategories(cleaned)
		} catch {
			// mantener defaults
		}
	}, [supabase])

	useEffect(() => {
		void refreshPostCategories()
		void refreshPublicidadCategories()
	}, [refreshPostCategories, refreshPublicidadCategories])

	const value = useMemo<CategoriesContextType>(
		() => ({
			postCategories,
			publicidadCategories,
			refreshPostCategories,
			refreshPublicidadCategories,
		}),
		[postCategories, publicidadCategories, refreshPostCategories, refreshPublicidadCategories]
	)

	return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useCategories() {
	const ctx = useContext(CategoriesContext)
	if (!ctx) throw new Error('useCategories must be used within CategoriesProvider')
	return ctx
}
