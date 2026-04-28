import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
	title: 'Eliminacion de datos | CST Comunidad',
	description: 'Instrucciones para solicitar la eliminacion de datos personales en CST Comunidad.',
}

export default function DataDeletionPage() {
	return (
		<LegalPage
			title="Eliminacion de datos de usuario"
			lastUpdated="28/04/2026"
			intro="Si queres eliminar tus datos personales de CST Comunidad, podes solicitarlo siguiendo estos pasos."
			sections={[
				{
					heading: '1. Como solicitar la eliminacion',
					paragraphs: [
						'Envia un correo a soporte@tudominio.com con el asunto: Eliminar mis datos.',
						'Inclui tu nombre de usuario y, si ingresaste con Facebook, el identificador asociado a tu cuenta para acelerar la validacion.',
					],
				},
				{
					heading: '2. Verificacion de identidad',
					paragraphs: [
						'Para proteger tu cuenta, podemos pedirte una verificacion minima de identidad antes de procesar la solicitud.',
					],
				},
				{
					heading: '3. Plazo de respuesta',
					paragraphs: [
						'Procesamos las solicitudes en un plazo maximo de 30 dias corridos.',
					],
				},
				{
					heading: '4. Alcance de la eliminacion',
					paragraphs: [
						'Eliminamos o anonimizamos los datos personales vinculados a tu cuenta, salvo informacion que debamos conservar por obligaciones legales o de seguridad.',
					],
				},
			]}
		/>
	)
}
