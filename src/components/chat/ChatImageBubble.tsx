'use client'

export function ChatImageBubble({ src }: { src: string; isMine?: boolean }) {
	return (
		<a
			href={src}
			target="_blank"
			rel="noopener noreferrer"
			className="block max-w-[min(100%,280px)] overflow-hidden rounded-md ring-1 ring-black/10 dark:ring-white/10"
		>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={src}
				alt="Imagen enviada en el chat"
				className="max-h-56 w-full object-cover"
				loading="lazy"
			/>
		</a>
	)
}
