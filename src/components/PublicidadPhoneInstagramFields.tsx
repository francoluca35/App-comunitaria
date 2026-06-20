'use client'

import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { ArgentinaWhatsAppPhoneField } from '@/components/ArgentinaWhatsAppPhoneField'

type Props = {
	phonePrefix: string
	onPhonePrefixChange: (code: string) => void
	phoneLocal: string
	onPhoneLocalChange: (local: string) => void
	instagramHandle: string
	onInstagramHandleChange: (handle: string) => void
	phoneInputId: string
	igInputId: string
}

const groupClass =
	'flex rounded-md border border-input bg-background overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-950'
const prefixClass =
	'flex items-center px-3 text-sm text-muted-foreground border-r border-input bg-muted/40 shrink-0 min-h-10 select-none'

export function PublicidadPhoneInstagramFields({
	phonePrefix,
	onPhonePrefixChange,
	phoneLocal,
	onPhoneLocalChange,
	instagramHandle,
	onInstagramHandleChange,
	phoneInputId,
	igInputId,
}: Props) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<ArgentinaWhatsAppPhoneField
				idPrefix={phoneInputId}
				prefix={phonePrefix}
				onPrefixChange={onPhonePrefixChange}
				localNumber={phoneLocal}
				onLocalNumberChange={onPhoneLocalChange}
				optional
				label="Número de teléfono"
				hint="Va a la publicación y al mensaje de Mario. Escribí el número completo con código de área, sin 0 ni 15 al inicio."
				className="space-y-2"
			/>
			<div className="space-y-2">
				<Label htmlFor={igInputId}>Instagram</Label>
				<div className={groupClass}>
					<span className={prefixClass} aria-hidden>
						@
					</span>
					<Input
						id={igInputId}
						type="text"
						autoComplete="off"
						spellCheck={false}
						placeholder="mi_negocio"
						className="border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 min-w-0 flex-1"
						value={instagramHandle}
						onChange={(e) => onInstagramHandleChange(e.target.value.replace(/^@+/, '').replace(/\s/g, ''))}
					/>
				</div>
			</div>
		</div>
	)
}
