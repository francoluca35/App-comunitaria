import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
	title: 'Terminos y condiciones | CST Comunidad',
	description: 'Terminos y condiciones de uso de CST Comunidad.',
}

export default function TermsPage() {
	return (
		<LegalPage
			title="Terminos y condiciones"
			lastUpdated="28/04/2026"
			intro="Al usar CST Comunidad aceptas estos terminos. Si no estas de acuerdo, te pedimos no utilizar la plataforma."
			sections={[
				{
					heading: '1. Uso de la plataforma',
					paragraphs: [
						'La plataforma esta destinada a difusion comunitaria. Te comprometés a usarla de buena fe, respetando a otros usuarios y la normativa aplicable.',
						'No esta permitido publicar contenido ilegal, violento, engañoso, discriminatorio o que vulnere derechos de terceros.',
					],
				},
				{
					heading: '2. Cuentas y responsabilidad',
					paragraphs: [
						'Sos responsable por la actividad realizada con tu cuenta y por mantener seguras tus credenciales de acceso.',
						'Podemos suspender o bloquear cuentas que incumplan estas reglas, sin perjuicio de acciones adicionales si corresponde.',
					],
				},
				{
					heading: '3. Contenido publicado',
					paragraphs: [
						'Cada usuario es responsable del contenido que publica. Al publicar, declaras que tenes derechos suficientes sobre ese contenido.',
						'Nos reservamos el derecho de moderar, ocultar o eliminar publicaciones que incumplan los terminos o afecten a la comunidad.',
					],
				},
				{
					heading: '4. Modificaciones y contacto',
					paragraphs: [
						'Podemos actualizar estos terminos cuando sea necesario. La version vigente sera la publicada en esta seccion.',
						'Para dudas sobre estos terminos, comunicate por los canales oficiales de CST Comunidad.',
					],
				},
			]}
		/>
	)
}
