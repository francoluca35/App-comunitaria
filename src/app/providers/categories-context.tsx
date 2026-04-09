'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_POST_CATEGORIES,
  DEFAULT_PUBLICIDAD_CATEGORIES,
  sanitizeCategoryRows,
  type NamedCategoryRow,
} from '@/lib/category-defaults'
import type { CategoriesContextType } from '@/app/providers/types'

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined)

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [postCategories, setPostCategories] = useState<NamedCategoryRow[]>(DEFAULT_POST_CATEGORIES)
  const [publicidadCategories, setPublicidadCategories] =
    useState<NamedCategoryRow[]>(DEFAULT_PUBLICIDAD_CATEGORIES)

  const refreshPostCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories/posts')
      if (!res.ok) return
      const data = await res.json()
      const cleaned = sanitizeCategoryRows(data)
      if (cleaned.length > 0) setPostCategories(cleaned)
    } catch {
      // mantener defaults
    }
  }, [])

  const refreshPublicidadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories/publicidad')
      if (!res.ok) return
      const data = await res.json()
      const cleaned = sanitizeCategoryRows(data)
      if (cleaned.length > 0) setPublicidadCategories(cleaned)
    } catch {
      // mantener defaults
    }
  }, [])

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
