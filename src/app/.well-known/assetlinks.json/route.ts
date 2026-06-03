import { NextResponse } from 'next/server'

/** Debe coincidir con `applicationId` en `android/app/build.gradle`. */
const ANDROID_PACKAGE = 'ar.com.comunidaddesantotome.cst'

/** Formato Google: huellas SHA-256 en mayúsculas con dos puntos (ej. AA:BB:…). */
function normalizeSha256Fingerprint(raw: string): string | null {
	const hex = raw.trim().replace(/[^a-fA-F0-9]/g, '')
	if (hex.length !== 64) return null
	return hex
		.toUpperCase()
		.match(/.{1,2}/g)!
		.join(':')
}

/**
 * Digital Asset Links para Trusted Web Activity (verificación dominio ↔ APK).
 * Configurá en producción: ANDROID_TWA_SHA256_FINGERPRINTS (separadas por coma o espacio).
 */
export function GET() {
	const raw = process.env.ANDROID_TWA_SHA256_FINGERPRINTS?.trim() ?? ''
	const fingerprints = raw
		.split(/[\s,]+/)
		.map(normalizeSha256Fingerprint)
		.filter((f): f is string => f !== null)

	if (fingerprints.length === 0) {
		return NextResponse.json([], {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300',
			},
		})
	}

	return NextResponse.json(
		[
			{
				relation: ['delegate_permission/common.handle_all_urls'],
				target: {
					namespace: 'android_app',
					package_name: ANDROID_PACKAGE,
					sha256_cert_fingerprints: fingerprints,
				},
			},
		],
		{
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=3600',
			},
		},
	)
}
