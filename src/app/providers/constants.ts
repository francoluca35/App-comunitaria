import type { AppConfig } from './types'
import type { Post } from './types'
import type { User } from './types'

export const APP_CONFIG_STORAGE_KEY = 'comunidad_app_config_v1'

export const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Admin Usuario',
    email: 'admin@comunidad.com',
    isAdmin: true,
    isBlocked: false,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    notificationPreference: 'all',
  },
  {
    id: '2',
    name: 'María González',
    email: 'maria@example.com',
    isAdmin: false,
    isBlocked: false,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    notificationPreference: 'all',
  },
  {
    id: '3',
    name: 'Carlos Rodríguez',
    email: 'carlos@example.com',
    isAdmin: false,
    isBlocked: false,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    notificationPreference: 'all',
  },
  {
    id: '4',
    name: 'Ana Martínez',
    email: 'ana@example.com',
    isAdmin: false,
    isBlocked: false,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    notificationPreference: 'all',
  },
]

export const MOCK_POSTS: Post[] = [
  {
    id: '1',
    title: 'Perro perdido en zona centro',
    description:
      'Busco a mi perro "Max", es un Golden Retriever de 3 años. Se perdió el día 5 de febrero cerca del parque central. Tiene collar azul con mi número de teléfono. Cualquier información será muy agradecida.',
    category: 'mascotas',
    media: [
      {
        url: 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800&h=600&fit=crop',
        type: 'image',
      },
    ],
    authorId: '2',
    authorName: 'María González',
    authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    status: 'approved',
    createdAt: new Date('2026-02-05T10:00:00'),
    whatsappNumber: '+5491123456789',
  },
  {
    id: '2',
    title: 'Alerta: Corte de luz programado',
    description:
      'La empresa eléctrica informa que habrá un corte de luz programado el día sábado 8 de febrero de 9:00 a 14:00 hs en las calles principales del barrio. Se recomienda tomar precauciones.',
    category: 'alertas',
    media: [
      {
        url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
        type: 'image',
      },
    ],
    authorId: '1',
    authorName: 'Admin Usuario',
    authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    status: 'approved',
    createdAt: new Date('2026-02-06T14:30:00'),
  },
  {
    id: '3',
    title: 'Encontré llaves en la plaza',
    description:
      'Encontré un manojo de llaves con llavero azul en la plaza del barrio esta mañana. Tiene 4 llaves y una etiqueta con iniciales "JR". Si son tuyas, contactame.',
    category: 'objetos',
    media: [
      {
        url: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&h=600&fit=crop',
        type: 'image',
      },
    ],
    authorId: '3',
    authorName: 'Carlos Rodríguez',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    status: 'approved',
    createdAt: new Date('2026-02-06T08:15:00'),
    whatsappNumber: '+5491134567890',
  },
  {
    id: '4',
    title: 'Reunión vecinal - Mejoras del barrio',
    description:
      'Se convoca a todos los vecinos a una reunión para discutir las próximas mejoras del barrio. Será el martes 11 de febrero a las 19:00 hs en el salón comunitario. Temas: seguridad, espacios verdes y mantenimiento.',
    category: 'avisos',
    media: [
      {
        url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop',
        type: 'image',
      },
    ],
    authorId: '4',
    authorName: 'Ana Martínez',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    status: 'approved',
    createdAt: new Date('2026-02-07T16:00:00'),
  },
  {
    id: '5',
    title: 'Nueva panadería en el barrio',
    description:
      'Abrió una nueva panadería artesanal en la esquina de Av. Principal y calle 5. Tienen pan casero, facturas y productos sin TACC. ¡Les recomiendo visitarlos!',
    category: 'noticias',
    media: [
      {
        url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&h=600&fit=crop',
        type: 'image',
      },
    ],
    authorId: '2',
    authorName: 'María González',
    authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    status: 'approved',
    createdAt: new Date('2026-02-07T11:20:00'),
  },
  {
    id: '6',
    title: 'Gato encontrado - busco dueño',
    description:
      'Encontré un gato gris con rayas blancas muy cariñoso. Parece estar bien cuidado así que seguro tiene dueño. Lo encontré en la calle 8. Temporalmente está en mi casa.',
    category: 'mascotas',
    media: [
      {
        url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=600&fit=crop',
        type: 'image',
      },
    ],
    authorId: '3',
    authorName: 'Carlos Rodríguez',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    status: 'pending',
    createdAt: new Date('2026-02-07T18:00:00'),
    whatsappNumber: '+5491134567890',
  },
  {
    id: '7',
    title: 'Precaución: Intento de robo reportado',
    description:
      'Vecinos de la cuadra 400 de calle 7 reportaron intento de robo anoche. Por favor estén atentos y reporten cualquier actividad sospechosa a la policía.',
    category: 'alertas',
    media: [],
    authorId: '4',
    authorName: 'Ana Martínez',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    status: 'pending',
    createdAt: new Date('2026-02-07T20:00:00'),
  },
]

export const DEFAULT_CONFIG: AppConfig = {
  commentsEnabled: true,
  whatsappEnabled: true,
  maxPostsPerUser: 5,
  maxImagesPerPost: 5,
  termsOfService:
    'Al publicar en esta plataforma, aceptas que tu contenido será moderado antes de ser visible públicamente. Prohibido contenido ofensivo, falso o ilegal.',
  heroTitle: 'Comunidad de Santo Tome',
  heroSubtitle: 'Bienvenido a nuestra comunidad',
  heroReferentName: 'Mario Stebler',
  heroReferentPhotoUrl: '',
}

export function loadAppConfigFromStorage(): AppConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = window.localStorage.getItem(APP_CONFIG_STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return DEFAULT_CONFIG
  }
}
