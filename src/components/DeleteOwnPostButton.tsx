'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { useApp } from '@/app/providers'
import { Button } from '@/app/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/app/components/ui/utils'

type Props = {
  postId: string
  authorId: string
  redirectTo?: string
  className?: string
  size?: 'sm' | 'icon'
  label?: string
  onDeleted?: () => void
}

export function DeleteOwnPostButton({
  postId,
  authorId,
  redirectTo,
  className,
  size = 'sm',
  label,
  onDeleted,
}: Props) {
  const { currentUser, deletePost } = useApp()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (!currentUser || currentUser.id !== authorId) return null

  const handle = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (
      !window.confirm(
        '¿Eliminar esta publicación de forma permanente? También se borrarán los comentarios. No se puede deshacer.'
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const result = await deletePost(postId)
      if (!result.ok) {
        toast.error(result.error ?? 'No se pudo eliminar')
        return
      }
      toast.success('Publicación eliminada')
      onDeleted?.()
      if (redirectTo) router.push(redirectTo)
    } finally {
      setBusy(false)
    }
  }

  if (size === 'icon') {
    return (
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className={cn(
          'h-9 w-9 shrink-0 rounded-xl border border-[#E8E0D5] bg-white text-red-600 shadow-sm hover:bg-red-50',
          className
        )}
        disabled={busy}
        onClick={handle}
        aria-label="Eliminar publicación"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('text-red-600 hover:bg-red-50', className)}
      disabled={busy}
      onClick={handle}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      {label ?? 'Eliminar'}
    </Button>
  )
}
