'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/dialog'

export function ChatImageBubble({ src }: { src: string; isMine?: boolean }) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="block max-w-[min(100%,280px)] cursor-zoom-in overflow-hidden rounded-md ring-1 ring-black/10 dark:ring-white/10"
				aria-label="Ver imagen ampliada"
			>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={src}
					alt="Imagen enviada en el chat"
					className="max-h-56 w-full object-cover"
					loading="lazy"
				/>
			</button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					variant="fullscreen"
					overlayClassName="bg-black/90 backdrop-blur-[1px]"
					showCloseButton={false}
					className="data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 duration-150"
					onClick={() => setOpen(false)}
				>
					<DialogTitle className="sr-only">Imagen del chat</DialogTitle>

					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="absolute right-2 top-2 z-[60] h-11 w-11 rounded-full border border-white/30 bg-black/50 text-white hover:bg-black/70 sm:right-4 sm:top-4"
						onClick={(e) => {
							e.stopPropagation()
							setOpen(false)
						}}
						aria-label="Cerrar"
					>
						<span className="text-2xl leading-none" aria-hidden>
							×
						</span>
					</Button>

					<div
						className="flex h-full w-full items-center justify-center p-4 pt-14"
						onClick={(e) => e.stopPropagation()}
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={src}
							alt="Imagen ampliada"
							className="max-h-[85dvh] max-w-full object-contain"
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
