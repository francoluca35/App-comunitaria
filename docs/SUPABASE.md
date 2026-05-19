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

### Proyecto nuevo (primera vez)

1. **SQL Editor** → pegá y ejecutá `supabase/schema.sql` completo.

### Proyecto que ya existe (tu caso habitual)

**No ejecutes `schema.sql` entero** (falla con *policy already exists*).

Ejecutá **una sola vez**, en este orden:

1. `supabase/migrations/20260520_fix_feed_rls_and_schema.sql`  
   Arregla: columna `proposed_category_label`, categorías, RLS sin recursión (error 500 en `posts`), RPC `comment_counts_for_posts`, permisos admin / admin_master / moderador.

2. Si solo faltaba borrar posts de admin_master y ya corriste el paso 1, no hace falta `20260519_admin_master_posts_rls.sql` (el paso 1 lo reemplaza).

3. `supabase/migrations/20260521_chat_message_receipts.sql` — tildes de lectura en el chat.

Tablas principales:

- **profiles**: usuarios (`role`: viewer, moderator, admin, admin_master)
- **posts** + **post_media** + **comments**
- **post_categories** / **publicidad_categories**
- **app_config**

## 4. Storage (imágenes y videos)

1. **Storage → New bucket** → nombre `publicaciones`, **Public bucket**.
2. Ejecutá `supabase/storage-policies.sql`.

## 5. Primer admin

En **Table Editor → profiles**, poné `role = 'admin'` al usuario, o:

```sql
update public.profiles set role = 'admin' where email = 'tu@email.com';
```

Super admin: `role = 'admin_master'`.

## 6. Verificar que el feed funciona

En SQL Editor:

```sql
select column_name from information_schema.columns
where table_name = 'posts' and column_name = 'proposed_category_label';

select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and proname = 'comment_counts_for_posts';
```

En la app: recargá el inicio. En la consola **no** deberían aparecer `500` en `/rest/v1/posts`.

## 7. Producción: login (Google / OAuth)

Ver sección de URL Configuration y OAuth en la documentación del proyecto.

## 8. Cliente en la app

```ts
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```
