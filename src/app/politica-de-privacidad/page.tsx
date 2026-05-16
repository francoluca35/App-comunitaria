import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
	title: 'Politica de privacidad | CST Comunidad',
	description: 'Politica de privacidad de CST Comunidad.',
}

export default function PrivacyPolicyPage() {
	return (
		<LegalPage
			title="Politica de privacidad"
			lastUpdated="28/04/2026"
			intro="En CST Comunidad cuidamos tu informacion personal y la usamos solo para operar la plataforma de manera segura, transparente y acorde a la normativa vigente."
			sections={[
				{
					heading: '1. Datos que recopilamos',
					paragraphs: [
						'Podemos recopilar datos de registro como nombre, correo electronico y foto de perfil, junto con la informacion que vos compartis al publicar contenido en la plataforma.',
						'Tambien podemos registrar datos tecnicos basicos como identificadores de sesion, tipo de dispositivo o eventos de uso para mejorar estabilidad y seguridad.',
					],
				},
				{
					heading: '2. Para que usamos tus datos',
					paragraphs: [
						'Usamos tu informacion para permitir el acceso a tu cuenta, mostrar tu perfil en la comunidad, moderar contenido y brindarte soporte.',
						'Tambien podemos usarla para prevenir fraudes, detectar abusos y cumplir obligaciones legales.',
					],
				},
				{
					heading: '3. Comparticion y almacenamiento',
					paragraphs: [
						'No vendemos tus datos personales. Solo los compartimos con proveedores tecnologicos necesarios para operar la app (por ejemplo, autenticacion, base de datos o hosting), bajo medidas de seguridad razonables.',
						'Conservamos la informacion mientras tu cuenta este activa o mientras sea necesaria para fines legales y operativos.',
					],
				},
				{
					heading: '4. Tus derechos',
					paragraphs: [
						'Podes solicitar acceso, rectificacion o eliminacion de tus datos, segun corresponda por ley.',
						'Para consultas sobre privacidad o soporte, escribinos a contacto@comunidaddesantotome.com.ar.',
					],
				},
			]}
		/>
	)
}
