'use client'

import { Share2, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { postPermalink } from '@/lib/app-public-url'
import { truncateForOgDescription } from '@/lib/share-metadata'
import { PreviewStorageImage } from '@/components/PreviewStorageImage'

export type PostSharePreview = {
	title: string
	description: string
	/** Primera imagen del post (URL de storage o relativa). */
	imageUrl?: string | null
}

type Props = {
	postId: string
	preview: PostSharePreview
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function SharePostPreviewDialog({ postId, preview, open, onOpenChange }: Props) {
	const url = postPermalink(postId)
	const description = truncateForOgDescription(preview.description, 120)
	const thumbSrc = preview.imageUrl ?? '/Assets/logo-mobil-launcher-192.png'

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(url)
			toast.success('Enlace copiado')
		} catch {
			toast.error('No se pudo copiar el enlace')
		}
	}

	const nativeShare = async () => {
		if (typeof navigator.share !== 'function') {
			await copyLink()
			return
		}
		try {
			await navigator.share({
				title: preview.title,
				text: description,
				url,
			})
			onOpenChange(false)
		} catch (e: unknown) {
			const name = e && typeof e === 'object' && 'name' in e ? String((e as { name: string }).name) : ''
			if (name !== 'AbortError') await copyLink()
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
				<DialogHeader className="space-y-1 border-b border-[#E4E6EB] px-4 py-3 text-left">
					<DialogTitle className="text-base">Vista previa al compartir</DialogTitle>
					<DialogDescription className="text-xs leading-snug">
						Así se verá el enlace en WhatsApp, Facebook y otras apps.
					</DialogDescription>
				</DialogHeader>

				<div className="border-b border-[#E4E6EB] bg-[#F0F2F5] p-3">
					<div className="overflow-hidden rounded-lg border border-[#CED0D4] bg-white shadow-sm">
						<div className="aspect-[1.91/1] w-full overflow-hidden bg-[#E4E6EB]">
							{preview.imageUrl ? (
								<PreviewStorageImage src={thumbSrc} alt="" className="h-full w-full object-cover" />
							) : (
								// eslint-disable-next-line @next/next/no-img-element
								<img src={thumbSrc} alt="" className="h-full w-full object-cover" />
							)}
						</div>
						<div className="space-y-0.5 px-2.5 py-2">
							<p className="text-[10px] font-medium uppercase tracking-wide text-[#65676B]">
								comunidaddesantotome.com.ar
							</p>
							<p className="line-clamp-2 text-sm font-semibold leading-snug text-[#050505]">
								{preview.title}
							</p>
							<p className="line-clamp-2 text-xs leading-snug text-[#65676B]">{description}</p>
						</div>
					</div>
				</div>

				<p className="break-all px-4 py-2 text-[11px] text-[#65676B]">{url}</p>

				<DialogFooter className="flex-row gap-2 border-t border-[#E4E6EB] px-4 py-3 sm:justify-stretch">
					<Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={() => void copyLink()}>
						<Link2 className="h-4 w-4" />
						Copiar enlace
					</Button>
					<Button type="button" className="flex-1 gap-1.5 bg-[#8B0015] hover:bg-[#5A000E]" onClick={() => void nativeShare()}>
						<Share2 className="h-4 w-4" />
						Compartir
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
