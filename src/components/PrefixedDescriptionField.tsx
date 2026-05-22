'use client'

import type { ReactNode } from 'react'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import { Checkbox } from '@/app/components/ui/checkbox'
import {
	DEFAULT_DESCRIPTION_PREFIX,
	buildPostDescription,
	maxEditableCharsForTotal,
} from '@/lib/default-description-prefix'

export type MarioPrefixToggleProps = {
	id: string
	includePrefix: boolean
	onIncludePrefixChange: (include: boolean) => void
	className?: string
}

export function MarioPrefixToggle({
	id,
	includePrefix,
	onIncludePrefixChange,
	className,
}: MarioPrefixToggleProps) {
	return (
		<div
			className={
				className ??
				'flex items-start gap-2 rounded-md border border-input bg-muted/30 px-3 py-2.5'
			}
		>
			<Checkbox
				id={id}
				checked={includePrefix}
				onCheckedChange={(checked) => onIncludePrefixChange(checked === true)}
			/>
			<Label htmlFor={id} className="cursor-pointer text-sm font-normal leading-snug text-foreground">
				Incluir «{DEFAULT_DESCRIPTION_PREFIX}» al inicio del mensaje
			</Label>
		</div>
	)
}

export type PrefixedDescriptionFieldProps = {
	id: string
	label: ReactNode
	/** Solo la parte editable (sin «Hola Mario.») cuando el prefijo está activo. */
	value: string
	onChange: (editable: string) => void
	placeholder?: string
	/** Tope del texto completo guardado (prefijo + cuerpo, o solo cuerpo si no hay prefijo). */
	maxTotalLength: number
	rows?: number
	className?: string
	textareaClassName?: string
	/** Si false, el campo es un textarea simple sin prefijo fijo. */
	includePrefix?: boolean
	/** Muestra casilla para activar/desactivar el prefijo (solo administradores). */
	allowPrefixToggle?: boolean
	onIncludePrefixChange?: (include: boolean) => void
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
	includePrefix = true,
	allowPrefixToggle = false,
	onIncludePrefixChange,
}: PrefixedDescriptionFieldProps) {
	const maxEditable = maxEditableCharsForTotal(maxTotalLength, includePrefix)
	const composedLen = buildPostDescription(value, { includePrefix }).length

	return (
		<div className={className ?? 'space-y-2'}>
			{allowPrefixToggle && onIncludePrefixChange ? (
				<MarioPrefixToggle
					id={`${id}-mario-prefix`}
					includePrefix={includePrefix}
					onIncludePrefixChange={onIncludePrefixChange}
				/>
			) : null}

			<Label htmlFor={id}>{label}</Label>

			{includePrefix ? (
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
			) : (
				<Textarea
					id={id}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					maxLength={maxTotalLength}
					rows={rows}
					className={textareaClassName ?? 'min-h-[120px] resize-y'}
				/>
			)}

			<p className="text-xs text-muted-foreground">
				{composedLen}/{maxTotalLength} caracteres
				{includePrefix ? ` (incluye «${DEFAULT_DESCRIPTION_PREFIX}»)` : ''}
			</p>
		</div>
	)
}
