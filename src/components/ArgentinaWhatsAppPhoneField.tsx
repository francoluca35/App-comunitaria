'use client'

import type { ReactNode } from 'react'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import {
	ARGENTINA_COUNTRY_PREFIX,
	ARGENTINA_PROVINCE_PREFIXES,
	DEFAULT_ARGENTINA_PROVINCE_PREFIX,
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
	provinceHint?: string
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
	provinceHint = 'Zona / prefijo (por defecto Santa Fe — Santo Tomé)',
	hint,
	className = '',
	inputClassName = '',
}: Props) {
	const provinceId = `${idPrefix}-province`
	const localId = `${idPrefix}-local`
	const hintId = `${idPrefix}-hint`

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

	const defaultHint = `El prefijo ya está fijo a la izquierda: solo completá tu número local (sin 0 ni 15 al inicio). Se guarda como ${ARGENTINA_COUNTRY_PREFIX} 9 ${prefix || DEFAULT_ARGENTINA_PROVINCE_PREFIX} + lo que escribas.`

	return (
		<div className={`space-y-2 ${className}`.trim()}>
			<Label htmlFor={localId}>{labelContent}</Label>
			<div className="space-y-1.5">
				<Label htmlFor={provinceId} className="text-xs font-normal text-[#7A5C52] dark:text-gray-400">
					{provinceHint}
				</Label>
				<select
					id={provinceId}
					value={prefix}
					onChange={(e) => onPrefixChange(e.target.value)}
					className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
				>
					{ARGENTINA_PROVINCE_PREFIXES.map((item) => (
						<option key={item.province} value={item.code}>
							{item.province} ({item.code})
						</option>
					))}
				</select>
			</div>
			<div className="flex min-h-10 w-full overflow-hidden rounded-md border border-input bg-background shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-[#8B0015]/25 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-950">
				<span
					className="flex shrink-0 items-center border-r border-input bg-muted/50 px-3 py-2 text-sm tabular-nums text-[#2B2B2B] dark:text-gray-200 select-none"
					aria-hidden
				>
					{ARGENTINA_COUNTRY_PREFIX} 9 {prefix}
				</span>
				<Input
					id={localId}
					type="tel"
					placeholder="solo tu número"
					value={localNumber}
					onChange={(e) => onLocalNumberChange(e.target.value)}
					required={required}
					inputMode="tel"
					autoComplete="tel-national"
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
