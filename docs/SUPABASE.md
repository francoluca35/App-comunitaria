# Setup Supabase – Comunidad

## 1. Crear proyecto

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto.
2. En **Project Settings → API** copiá:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Variables en la app

En la raíz del proyecto (Next.js):

```bash
cp .env.example .env.local
```

Editá `.env.local` y pegá la URL y la anon key.

## 3. Base de datos

1. En el dashboard: **SQL Editor**.
2. Abrí el archivo `supabase/schema.sql` de este repo y copiá todo.
3. Pegalo en el editor y ejecutá **Run**.

Con eso quedan creadas:

- **profiles**: usuario (email, name, avatar_url, role, status). Se llena solo al registrarse con `role = viewer`.
- **posts**: publicaciones (author_id, title, description, category, status, whatsapp_number).
- **post_media**: URLs de imágenes/videos por publicación.
- **comments**: comentarios.
- **app_config**: configuración (comentarios, WhatsApp, límites).
- **Trigger**: al registrarse en Auth se crea la fila en `profiles` con `role = viewer`.

## 4. Storage (imágenes y videos)

1. En el dashboard: **Storage → New bucket**.
2. Nombre: `publicaciones`. Marcá **Public bucket** (para poder usar las URLs en la app).
3. En **SQL Editor** ejecutá el contenido de `supabase/storage-policies.sql` (políticas de subida/lectura/borrado).

Las URLs que guardes en `post_media` serán de la forma:
`https://tu-proyecto.supabase.co/storage/v1/object/public/publicaciones/...`

## 5. Primer admin

Los usuarios que se registren por la app tendrán siempre `role = viewer`. El primer admin se define a mano:

**Opción A – Desde el dashboard**

1. **Authentication → Users**: si ya tenés un usuario, copiá su **UUID**. Si no, creá uno (Add user) y copiá el UUID.
2. **Table Editor → profiles**: buscá la fila con ese `id` y cambiá `role` a `admin`. Guardá.

**Opción B – Por SQL**

En SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@comunidad.com';
```

(El usuario `admin@comunidad.com` tiene que existir en **Authentication → Users**; si no, crealo antes.)

## 6. Uso en la app

El cliente ya está en `src/lib/supabase/client.ts`:

```ts
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
// supabase.auth.signUp(...)  |  supabase.from('posts').select(...)  |  etc.
```

Próximos pasos: conectar el login/registro y las pantallas de publicaciones a Supabase (reemplazar el mock de `providers.tsx` por llamadas a `supabase.auth` y a las tablas).
