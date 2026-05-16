import Link from 'next/link'

const SUPPORT_EMAIL = 'contacto@comunidaddesantotome.com.ar'

type Variant = 'mobile-dark' | 'mobile-light' | 'desktop'

const linkClass: Record<Variant, string> = {
	'mobile-dark':
		'text-white/60 underline underline-offset-2 hover:text-white/85 os-light:text-[#7A5C52] os-light:hover:text-[#5c5652]',
	'mobile-light':
		'text-white/60 underline underline-offset-2 hover:text-white/85 os-light:text-[#7A5C52] os-light:hover:text-[#5c5652]',
	desktop: 'text-slate-500 underline underline-offset-2 hover:text-[#871303]',
}

const noteClass: Record<Variant, string> = {
	'mobile-dark': 'text-[11px] leading-snug text-white/55 os-light:text-[#7A5C52]',
	'mobile-light': 'text-[11px] leading-snug text-white/55 os-light:text-[#7A5C52]',
	desktop: 'text-[12px] leading-relaxed text-slate-500',
}

export function LoginOAuthTrustNote({ variant }: { variant: Variant }) {
	return (
		<p className={noteClass[variant]}>
			El inicio de sesión con Google o Facebook es seguro y solo solicita nombre, foto y correo
			electrónico para crear tu acceso en CST Comunidad. No tiene acceso a Gmail ni a información
			personal fuera de lo necesario para tu cuenta.
		</p>
	)
}

export function LoginLegalLinks({ variant }: { variant: Variant }) {
	const cls = linkClass[variant]
	return (
		<nav
			className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] ${variant === 'desktop' ? 'sm:text-xs' : ''}`}
			aria-label="Información legal"
		>
			<Link href="/politica-de-privacidad" className={cls}>
				Privacidad
			</Link>
			<span className={variant === 'desktop' ? 'text-slate-300' : 'text-white/25 os-light:text-[#D8D2CC]'}>
				·
			</span>
			<Link href="/terminos-y-condiciones" className={cls}>
				Términos
			</Link>
			<span className={variant === 'desktop' ? 'text-slate-300' : 'text-white/25 os-light:text-[#D8D2CC]'}>
				·
			</span>
			<a href={`mailto:${SUPPORT_EMAIL}`} className={cls}>
				Contacto
			</a>
		</nav>
	)
}
