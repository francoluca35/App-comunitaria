'use client'

import type { ReactNode } from 'react'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import {
	ARGENTINA_COUNTRY_PREFIX,
	normalizeArgentinaMobileInput,
	parseArgentinaMobileInput,
} from '@/lib/argentina-phone'

type Props = {
	idPrefix: string
	prefix: string
	onPrefixChange: (code: string) => void
	localNumber: string
	onLocalNumberChange: (value: string) => void
	required?: boolean
	optional?: boolean
	label?: ReactNode
	hint?: string
	className?: string
	inputClassName?: string
}

export function ArgentinaWhatsAppPhoneField({
	idPrefix,
	prefix,
	onPrefixChange,
	localNumber,
	onLocalNumberChange,
	required = false,
	optional = false,
	label,
	hint,
	className = '',
	inputClassName = '',
}: Props) {
	const inputId = `${idPrefix}-phone`
	const hintId = `${idPrefix}-hint`
	const displayValue = `${prefix}${localNumber}`

	const labelContent =
		label ??
		(
			<>
				WhatsApp{' '}
				{optional ? (
					<span className="font-normal text-slate-500 dark:text-slate-400">(opcional)</span>
				) : required ? (
					<span className="text-red-600">*</span>
				) : null}
			</>
		)

	const defaultHint = `Escribí tu número completo con código de área (ej. 3426123456 o 1161234567), sin 0 ni 15 al inicio. Se guarda como ${ARGENTINA_COUNTRY_PREFIX} 9 + tu número para WhatsApp.`

	const handleChange = (raw: string) => {
		const normalized = normalizeArgentinaMobileInput(raw)
		const parsed = parseArgentinaMobileInput(normalized)
		onPrefixChange(parsed.prefix)
		onLocalNumberChange(parsed.local)
	}

	return (
		<div className={`space-y-2 ${className}`.trim()}>
			<Label htmlFor={inputId}>{labelContent}</Label>
			<div className="flex min-h-10 w-full overflow-hidden rounded-md border border-input bg-background shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-[#8B0015]/25 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-950">
				<span
					className="flex shrink-0 items-center border-r border-input bg-muted/50 px-2.5 py-2 text-sm tabular-nums text-[#2B2B2B] dark:text-gray-200 select-none sm:px-3"
					aria-hidden
				>
					{ARGENTINA_COUNTRY_PREFIX} 9
				</span>
				<Input
					id={inputId}
					type="tel"
					placeholder="3426123456"
					value={displayValue}
					onChange={(e) => handleChange(e.target.value)}
					required={required}
					inputMode="tel"
					autoComplete="tel"
					className={`min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none h-10 ${inputClassName}`.trim()}
					aria-describedby={hintId}
				/>
			</div>
			<p id={hintId} className="text-xs text-[#7A5C52] dark:text-gray-400">
				{hint ?? defaultHint}
			</p>
		</div>
	)
}
