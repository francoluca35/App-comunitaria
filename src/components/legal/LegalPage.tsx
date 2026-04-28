'use client'

import Link from 'next/link'

type LegalPageProps = {
	title: string
	lastUpdated: string
	intro: string
	sections: Array<{
		heading: string
		paragraphs: string[]
	}>
}

export function LegalPage({ title, lastUpdated, intro, sections }: LegalPageProps) {
	return (
		<main className="min-h-screen bg-[#f4f3f8] px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-3xl rounded-2xl border border-[#D8D2CC] bg-white p-6 shadow-sm sm:p-8">
				<Link href="/login" className="text-sm font-semibold text-[#8B0015] hover:underline">
					Volver
				</Link>
				<h1 className="mt-3 text-2xl font-bold text-[#2B2B2B] sm:text-3xl">{title}</h1>
				<p className="mt-2 text-sm text-[#7A5C52]">Ultima actualizacion: {lastUpdated}</p>
				<p className="mt-4 text-sm leading-6 text-[#2B2B2B] sm:text-base">{intro}</p>

				<div className="mt-7 space-y-6">
					{sections.map((section) => (
						<section key={section.heading}>
							<h2 className="text-lg font-semibold text-[#2B2B2B]">{section.heading}</h2>
							<div className="mt-2 space-y-2">
								{section.paragraphs.map((paragraph) => (
									<p key={paragraph} className="text-sm leading-6 text-[#2B2B2B] sm:text-base">
										{paragraph}
									</p>
								))}
							</div>
						</section>
					))}
				</div>
			</div>
		</main>
	)
}
