import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

function getAppName() {
  return (process.env.NEXT_PUBLIC_APP_NAME || 'Difusión Comunitaria').trim()
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createClient(token)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)
  if (userError || !user?.id) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  // La policy Owner can read own publicidad_requests ya valida owner_id = auth.uid().
  const { data: pub, error: pubError } = await supabase
    .from('publicidad_requests')
    .select('id,title,description,days_active,price_amount,status,start_at,end_at,created_at,phone_number,instagram')
    .eq('id', id)
    .maybeSingle()

  if (pubError) return NextResponse.json({ error: pubError.message }, { status: 500 })
  if (!pub) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (pub.status !== 'active') return NextResponse.json({ error: 'Comprobante disponible solo para publicidades activas' }, { status: 400 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,name,email,phone,province,locality')
    .eq('id', user.id)
    .single()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  const appName = getAppName()
  const invoiceNumber = `PUB-${String(pub.id).slice(0, 8).toUpperCase()}`
  const issuedAt = new Date().toISOString()

  // ---------------- PDF ----------------
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()

  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const margin = 48
  let y = height - margin

  const drawText = (text: string, size: number, bold = false, color = rgb(0.12, 0.12, 0.14)) => {
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: bold ? fontBold : font,
      color,
    })
    y -= size + 6
  }

  drawText(appName, 18, true)
  drawText('Comprobante de publicidad', 12, false, rgb(0.35, 0.35, 0.4))
  y -= 8

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.88),
  })
  y -= 18

  drawText(`Nro: ${invoiceNumber}`, 11, true)
  drawText(`Emitido: ${fmtDateShort(issuedAt)}`, 10)
  y -= 6

  drawText('Cliente', 12, true)
  drawText(`Nombre: ${profile?.name ?? '-'}`, 10)
  drawText(`Email: ${profile?.email ?? '-'}`, 10)
  drawText(`Teléfono: ${profile?.phone ?? '-'}`, 10)
  drawText(`Ubicación: ${[profile?.locality, profile?.province].filter(Boolean).join(', ') || '-'}`, 10)
  y -= 10

  drawText('Publicidad', 12, true)
  drawText(`Título: ${pub.title ?? '-'}`, 10)
  drawText(`Descripción: ${(pub.description ?? '-').slice(0, 220)}`, 10)
  drawText(`Contacto: ${pub.phone_number ?? '-'}${pub.instagram ? ` · IG: ${pub.instagram}` : ''}`, 10)
  drawText(`Días: ${pub.days_active ?? 0}`, 10)
  drawText(`Inicio: ${fmtDateShort(pub.start_at)} · Fin: ${fmtDateShort(pub.end_at)}`, 10)
  y -= 10

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.88),
  })
  y -= 18

  drawText('Total abonado', 12, true)
  drawText(`${pub.price_amount ?? 0} ARS`, 14, true)
  y -= 8
  drawText('Este comprobante es informativo. No incluye imágenes.', 9, false, rgb(0.45, 0.45, 0.5))

  const bytes = await pdf.save()
  const filename = `comprobante-${invoiceNumber}.pdf`

  // NextResponse espera BodyInit; en Node, Buffer es válido.
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

