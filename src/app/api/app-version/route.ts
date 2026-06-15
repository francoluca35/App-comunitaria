import { NextResponse } from 'next/server'

const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? process.env.APP_VERSION ?? '0.0.0'
/** Forzar actualización solo si el cliente está por debajo de APP_MIN_SUPPORTED_VERSION. */
const MIN_SUPPORTED_VERSION = process.env.APP_MIN_SUPPORTED_VERSION?.trim() || '0.0.0'

export async function GET() {
	return NextResponse.json(
		{
			version: CURRENT_VERSION,
			minSupportedVersion: MIN_SUPPORTED_VERSION,
		},
		{
			headers: {
				'Cache-Control': 'no-store, max-age=0',
			},
		}
	)
}
