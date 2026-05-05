'use client'

import type { ReactNode } from 'react'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import {
	DEFAULT_DESCRIPTION_PREFIX,
	ensureDefaultDescriptionPrefix,
	maxEditableCharsForTotal,
} from '@/lib/default-description-prefix'

export type PrefixedDescriptionFieldProps = {
	id: string
	label: ReactNode
	/** Solo la parte editable (sin «hola mario.»). */
	value: string
	onChange: (editable: string) => void
	placeholder?: string
	/** Tope del texto completo guardado (prefijo + cuerpo). */
	maxTotalLength: number
	rows?: number
	className?: string
	textareaClassName?: string
}

export function PrefixedDescriptionField({
	id,
	label,
	value,
	onChange,
	placeholder,
	maxTotalLength,
	rows = 5,
	className,
	textareaClassName,
}: PrefixedDescriptionFieldProps) {
	const maxEditable = maxEditableCharsForTotal(maxTotalLength)
	const composedLen = ensureDefaultDescriptionPrefix(value).length

	return (
		<div className={className ?? 'space-y-2'}>
			<Label htmlFor={id}>{label}</Label>
			<div className="flex min-h-0 w-full items-stretch overflow-hidden rounded-md border border-input bg-background shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
				<span
					className="flex shrink-0 items-start border-r border-input bg-muted/50 px-3 pb-2 pt-[10px] text-sm leading-normal text-foreground/85 select-none"
					aria-hidden
				>
					{DEFAULT_DESCRIPTION_PREFIX}
				</span>
				<Textarea
					id={id}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					maxLength={maxEditable}
					rows={rows}
					className={
						textareaClassName ??
						'min-h-[inherit] flex-1 resize-y rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0'
					}
				/>
			</div>
			<p className="text-xs text-muted-foreground">
				{composedLen}/{maxTotalLength} caracteres (incluye «{DEFAULT_DESCRIPTION_PREFIX}»)
			</p>
		</div>
	)
}
