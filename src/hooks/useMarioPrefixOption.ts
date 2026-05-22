'use client'

import { useState } from 'react'
import { canToggleMarioPrefix } from '@/lib/default-description-prefix'
import type { User } from '@/app/providers/types'

export function useMarioPrefixOption(currentUser: User | null | undefined) {
	const canToggle = canToggleMarioPrefix(currentUser)
	const [includeMarioPrefix, setIncludeMarioPrefix] = useState(true)

	return {
		includeMarioPrefix: canToggle ? includeMarioPrefix : true,
		setIncludeMarioPrefix,
		canToggleMarioPrefix: canToggle,
	}
}
