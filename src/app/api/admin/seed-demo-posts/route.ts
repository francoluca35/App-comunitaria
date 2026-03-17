import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

type DemoPost = {
  title: string
  description: string
  category: 'mascotas' | 'alertas' | 'avisos' | 'objetos' | 'noticias'
  imageUrl: string
}

const DEMO_POSTS: DemoPost[] = [
  {
    title: 'Perro encontrado en Parque Central',
    description:
      'Encontré un perro mediano, responde al nombre Toby. Tiene collar azul. Está sano y muy cariñoso. Por favor contactar por WhatsApp para que vuelva con su familia.',
    category: 'mascotas',
    imageUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
  },
  {
    title: 'Corte de agua programado',
    description:
      'Mañana martes de 9 a 13 hs habrá corte de agua en calle San Martín entre Belgrano y Mitre. Obras de la cooperativa. Abastecerse con anticipación.',
    category: 'alertas',
    imageUrl: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800',
  },
  {
    title: 'Venta de garaje - Sábado',
    description:
      'Sábado 10 a 17 hs. Juguetes, ropa de niños, libros y pequeños electrodomésticos. Precios accesibles. Calle Belgrano 200.',
    category: 'avisos',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  },
  {
    title: 'Bicicleta en venta - Rodado 26',
    description:
      'Bicicleta poco uso, rodado 26, cambios Shimano. Ideal para paseo. Precio a convenir. Escribir por mensaje.',
    category: 'objetos',
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800',
  },
  {
    title: 'Inauguración nuevo centro de salud',
    description:
      'El próximo lunes a las 10 hs se inaugura el nuevo centro de salud del barrio. Están todos invitados. Habrá atención gratuita durante la semana.',
    category: 'noticias',
    imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
  },
  {
    title: 'Gata en adopción responsable',
    description:
      'Gata adulta, castrada, muy tranquila. Busca hogar con patio o espacio. Se entrega con cucha y comedero. Sin cargo.',
    category: 'mascotas',
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
  },
  {
    title: 'Alerta meteorológica - Tormentas',
    description:
      'El Servicio Meteorológico anuncia tormentas fuertes para esta noche. Evitar circular. Revisar desagües y objetos sueltos en patios.',
    category: 'alertas',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
  },
  {
    title: 'Clases de apoyo escolar gratuitas',
    description:
      'Vecinos del barrio ofrecen clases de apoyo en matemática y lengua para primaria. Lunes y miércoles 17 hs. Consultar por WhatsApp.',
    category: 'avisos',
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
  },
]

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(token)
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user?.id) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
  }

  const storage = createServiceRoleClient()
  if (!storage) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 503 })
  }

  const authorId = user.id
  let created = 0

  try {
    for (const demo of DEMO_POSTS) {
      const { data: post, error: postError } = await storage
        .from('posts')
        .insert({
          author_id: authorId,
          title: demo.title,
          description: demo.description,
          category: demo.category,
          status: 'approved',
          whatsapp_number: null,
        })
        .select('id')
        .single()

      if (postError || !post?.id) {
        console.error('Seed post error:', postError)
        continue
      }

      await storage.from('post_media').insert({
        post_id: post.id,
        url: demo.imageUrl,
        type: 'image',
        position: 0,
      })
      created++
    }

    return NextResponse.json({ ok: true, created })
  } catch (e) {
    console.error('Seed demo posts error:', e)
    return NextResponse.json({ error: 'Error al crear publicaciones' }, { status: 500 })
  }
}
