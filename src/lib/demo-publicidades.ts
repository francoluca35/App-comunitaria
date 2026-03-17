/**
 * Publicidades demo: llamativas, con imagen y CTA a WhatsApp o Instagram.
 * Usado en /publicidades, en la columna de publicidad del layout y en el carrusel de la zona publicitaria.
 */


export interface DemoPublicidad {
  id: string
  title: string
  description: string
  category: string
  createdAt: Date
  imageUrl?: string
  ctaType?: 'whatsapp' | 'instagram'
  ctaLabel?: string
  ctaUrl?: string
}

export const DEMO_PUBLICIDADES: DemoPublicidad[] = [
  {
    id: '1',
    title: 'Plomería 24 hs – Arreglos urgentes',
    description: 'Servicio rápido y con garantía. Instalaciones, pérdidas y destapado. Presupuesto sin cargo.',
    category: 'servicios',
    createdAt: new Date('2025-03-01'),
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800',
    ctaType: 'whatsapp',
    ctaLabel: 'Consultar por WhatsApp',
    ctaUrl: 'https://wa.me/5491112345678',
  },
  {
    id: '2',
    title: 'Muebles a medida – Diseño y calidad',
    description: 'Carpintería y melamina. Presupuesto a domicilio. Seguinos para ver trabajos realizados.',
    category: 'ventas',
    createdAt: new Date('2025-03-02'),
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
    ctaType: 'instagram',
    ctaLabel: 'Ver en Instagram',
    ctaUrl: 'https://instagram.com',
  },
  {
    id: '3',
    title: 'Clases de guitarra y bajo',
    description: 'Aprendé desde cero o mejorá tu técnica. Clases presenciales y online. Todos los niveles.',
    category: 'servicios',
    createdAt: new Date('2025-03-03'),
    imageUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800',
    ctaType: 'whatsapp',
    ctaLabel: 'Escribime por WhatsApp',
    ctaUrl: 'https://wa.me/5491198765432',
  },
  {
    id: '4',
    title: 'Depósito en alquiler – Zona centro',
    description: '50 m², ideal para stock o taller. Precio accesible. Contactar para visitar.',
    category: 'alquileres',
    createdAt: new Date('2025-03-04'),
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
    ctaType: 'whatsapp',
    ctaLabel: 'Consultar disponibilidad',
    ctaUrl: 'https://wa.me/5491155551234',
  },
  {
    id: '5',
    title: 'Buscamos vendedor/a para local',
    description: 'Media jornada. Buena presencia y trato con el público. Enviar CV por Instagram.',
    category: 'trabajo',
    createdAt: new Date('2025-03-05'),
    imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800',
    ctaType: 'instagram',
    ctaLabel: 'Enviar CV por Instagram',
    ctaUrl: 'https://instagram.com',
  },
  {
    id: '6',
    title: 'Panadería artesanal – Pedidos por WhatsApp',
    description: 'Pan fresco, facturas y tortas. Pedidos con un día de anticipación. Envíos a domicilio.',
    category: 'ventas',
    createdAt: new Date('2025-03-06'),
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
    ctaType: 'whatsapp',
    ctaLabel: 'Hacé tu pedido',
    ctaUrl: 'https://wa.me/5491166667890',
  },
]

/** 4 publicidades selectivas para el carrusel doble de la zona publicitaria (inicio, abajo) */
export const ZONA_CARRUSEL_PUBLICIDADES: DemoPublicidad[] = DEMO_PUBLICIDADES.slice(0, 4)
