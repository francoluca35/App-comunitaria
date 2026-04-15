'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { NamedCategoryRow } from '@/lib/category-defaults'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  title: string
  description?: string
  listUrl: string
  adminUrl: string
  onListChanged?: () => void
  /** Publicaciones del feed vs categorías solo para la sección Publicidades (listas independientes). */
  categoryKind?: 'posts' | 'publicidad'
}

export function AdminCategoryManager({
  title,
  description,
  listUrl,
  adminUrl,
  onListChanged,
  categoryKind = 'posts',
}: Props) {
  const [items, setItems] = useState<NamedCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editOrder, setEditOrder] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(listUrl)
      if (!res.ok) throw new Error('Error al cargar')
      const data = (await res.json()) as NamedCategoryRow[]
      if (Array.isArray(data)) setItems(data)
    } catch {
      toast.error('No se pudieron cargar las categorías')
    } finally {
      setLoading(false)
    }
  }, [listUrl])

  useEffect(() => {
    load()
  }, [load])

  const getToken = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const startEdit = (row: NamedCategoryRow) => {
    setEditingSlug(row.slug)
    setEditLabel(row.label)
    setEditOrder(row.sort_order)
  }

  const cancelEdit = () => {
    setEditingSlug(null)
    setEditLabel('')
    setEditOrder(0)
  }

  const saveEdit = async () => {
    if (!editingSlug) return
    const token = await getToken()
    if (!token) {
      toast.error('Sesión expirada')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(adminUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: editingSlug,
          label: editLabel.trim(),
          sort_order: editOrder,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? 'Error al guardar')
        return
      }
      toast.success('Categoría actualizada')
      cancelEdit()
      await load()
      onListChanged?.()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (slug: string, label: string) => {
    if (!confirm(`¿Eliminar la categoría "${label}"?`)) return
    const token = await getToken()
    if (!token) {
      toast.error('Sesión expirada')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${adminUrl}?slug=${encodeURIComponent(slug)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? 'Error al eliminar')
        return
      }
      toast.success('Categoría eliminada')
      await load()
      onListChanged?.()
    } finally {
      setSaving(false)
    }
  }

  const add = async () => {
    const label = newLabel.trim()
    if (!label) {
      toast.error('Escribí el nombre de la categoría')
      return
    }
    const token = await getToken()
    if (!token) {
      toast.error('Sesión expirada')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(adminUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label, sort_order: items.length + 1 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? 'Error al crear')
        return
      }
      toast.success('Categoría creada')
      setNewLabel('')
      await load()
      onListChanged?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {(title || description) && (
        <div>
          {title ? <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3> : null}
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-8 h-8 animate-spin text-[#8B0015]" />
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((row) => (
            <li
              key={row.slug}
              className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3"
            >
              {editingSlug === row.slug ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor={`label-${row.slug}`}>Nombre</Label>
                    <Input
                      id={`label-${row.slug}`}
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`order-${row.slug}`}>Orden</Label>
                    <Input
                      id={`order-${row.slug}`}
                      type="number"
                      value={editOrder}
                      onChange={(e) => setEditOrder(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={saving}>
                      Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{row.label}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      {categoryKind === 'publicidad' ? (
                        <>
                          Solo publicidades · código <span className="font-mono">{row.slug}</span> · orden{' '}
                          {row.sort_order}
                          <span className="block mt-0.5 text-slate-400 dark:text-gray-500">
                            No se usa en “Nueva publicación” ni en /categoria/…
                          </span>
                        </>
                      ) : (
                        <>
                          Feed y nueva publicación · /categoria/{row.slug} · orden {row.sort_order}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(row)} aria-label="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => remove(row.slug, row.label)}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-[#8B0015]/35 dark:border-[#8B0015]/60 p-4 space-y-3 bg-[#8B0015]/10 dark:bg-[#8B0015]/20">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Nueva categoría</p>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {categoryKind === 'publicidad' ? (
            <>
              Nombre visible en filtros de publicidades. El código interno se genera solo y{' '}
              <strong className="font-medium">no se mezcla</strong> con las categorías del feed de novedades.
            </>
          ) : (
            <>
              Escribí el nombre como lo verán los usuarios (ej.{' '}
              <span className="italic">Pérdida de mascotas</span>). La URL /categoria/… y el código interno se
              generan solos; son independientes de las categorías de publicidad.
            </>
          )}
        </p>
        <div className="space-y-2">
          <Label htmlFor="new-cat-label">Nombre de la categoría</Label>
          <Input
            id="new-cat-label"
            placeholder="Ej: Pérdida de mascotas"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
        </div>
        <Button type="button" className="w-full" onClick={add} disabled={saving}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar categoría
        </Button>
      </div>
    </div>
  )
}
