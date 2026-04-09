# Rendimiento y arquitectura del feed (seguimiento de auditoría)

Este documento resume los problemas que se identificaron en la revisión técnica del feed y el contexto global de la app, **qué quedó resuelto en código**, y **qué sigue abierto** para iteraciones futuras.

---

## 1. Conteos de comentarios sin traer una fila por comentario

**Problema:** Para mostrar “cuántos comentarios tiene cada publicación”, el cliente podía terminar descargando **una fila por cada comentario** solo para agregar en el cliente (costoso en publicaciones con mucha actividad).

**Solución:**

- Migración SQL: `supabase/migrations/comment_counts_for_posts_rpc.sql`
  - Función `public.comment_counts_for_posts(p_post_ids uuid[])` que devuelve filas `(post_id, comment_count)` con un `GROUP BY` en la base.
  - `GRANT EXECUTE` a `anon` y `authenticated` para que el cliente de Supabase pueda invocarla con las mismas reglas RLS que aplican al rol.
- En `src/app/providers/community-context.tsx`, `refreshCommentCountsForPostIds`:
  - Parte los IDs en chunks de **100**.
  - Intenta primero `supabase.rpc('comment_counts_for_posts', { p_post_ids: chunk })`.
  - Si la RPC falla (por ejemplo, migración aún no aplicada en un entorno), hace **fallback** a `from('comments').select('post_id').in('post_id', chunk)` y agrega en el cliente (comportamiento anterior).
- Los posts **sin comentarios** no aparecen en el resultado de la RPC; el cliente asigna **0** para esos IDs al fusionar el mapa.

**Despliegue (migrar a RPC en Supabase):**

1. En el [SQL Editor](https://supabase.com/dashboard) del proyecto, ejecutá el contenido completo de `supabase/migrations/comment_counts_for_posts_rpc.sql` (o usá la CLI de Supabase si tenés el proyecto linkeado: `supabase db push` / migraciones según tu flujo).
2. Verificá que exista la función: en SQL, `select proname from pg_proc join pg_namespace n on n.oid = pronamespace where n.nspname = 'public' and proname = 'comment_counts_for_posts';`
3. En la app, abrí el feed: en la consola del navegador no debería aparecer el warning `comment_counts_for_posts (RPC):` si la RPC responde bien. Si aparece, revisá RLS sobre `comments` y que `GRANT EXECUTE` esté aplicado.

Hasta que la migración no esté aplicada, la app sigue funcionando por el **fallback** (select de `post_id`).

**Tipado en cliente:** `src/app/providers/comment-counts.ts` centraliza el parseo de filas RPC.

---

## 2. Comentarios: carga perezosa y estado en contexto

**Problema:** Cargar todos los comentarios de todas las publicaciones al armar el feed no escala.

**Enfoque actual (ya alineado con la auditoría):**

- Los comentarios completos se cargan bajo demanda con `loadCommentsForPost(postId)` cuando la UI lo necesita (por ejemplo, al expandir o abrir detalle).
- Los **conteos** se mantienen en `commentCountByPostId` y se refrescan cuando cambia el conjunto de IDs de posts visibles (ver sección anterior).

---

## 3. Paginación del feed

**Problema:** Traer “todos los posts” de una sola vez.

**Solución:**

- Constante `POSTS_FEED_PAGE_SIZE` (20) en `src/app/providers/post-mapper.ts`.
- Carga inicial con `.range(0, POSTS_FEED_PAGE_SIZE - 1)` y flag `postsHasMore` según si la página vino llena.
- `loadMorePosts` pide el siguiente rango y deduplica/concatena; la home (`src/app/page.tsx`) usa un **sentinel** con `IntersectionObserver` para disparar la carga al hacer scroll.

---

## 4. Imágenes remotas (Next.js)

**Problema:** Uso de `next/image` con URLs de Supabase Storage sin configuración explícita.

**Solución:** En `next.config.mjs`, `images.remotePatterns` se construye a partir de `NEXT_PUBLIC_SUPABASE_URL` para permitir el path `/storage/v1/object/**` del proyecto actual.

---

## 5. Contextos React (diseño por capas)

**Problema:** Un solo contexto gigante hacía que cualquier cambio en posts re-renderizara también consumidores que solo necesitaban el usuario o la configuración.

**Solución:** Varios providers anidados bajo `AppProvider` en `src/app/providers.tsx`, cada uno con su hook:

| Provider / hook | Responsabilidad |
|-----------------|-----------------|
| `RecentRegistrationsProvider` / `useRecentRegistrationsState()` | Lista en memoria de registros recientes (admin); `AuthProvider` usa internamente `useAppendRecentRegistration()` al registrar. |
| `AuthProvider` / `useAuth()` | Sesión, perfil, login, registro, preferencias de notificación, Web Push ligado a sesión. |
| `AppConfigProvider` / `useAppConfig()` | `config` y `updateConfig` (localStorage). |
| `CategoriesProvider` / `useCategories()` | Categorías de posts y de publicidad (API). |
| `CommunityProvider` / `useCommunity()` | Posts, paginación, comentarios, conteos (RPC), admin de usuarios, realtime admin/moderación. |

**Compatibilidad:** `useApp()` sigue existiendo y **compone** los hooks anteriores en un solo objeto (`AppContextType`), igual que antes, para no tocar todas las pantallas de golpe.

**Recomendación:** En componentes que solo usan `currentUser`, preferí `useAuth()` (desde `@/app/providers` o `@/app/providers/auth-context`) para evitar re-renders cuando cambian los posts. Lo mismo para `useAppConfig()`, `useCategories()` o `useCommunity()` según el caso.

Módulos de soporte (sin contexto propio): `types.ts`, `constants.ts`, `post-mapper.ts`, `user-mapper.ts`, `comment-counts.ts`.

---

## 6. Comportamiento que no cambió (consciente)

- Si falla la obtención de posts desde Supabase, la app puede seguir usando **datos mock** (`MOCK_POSTS` / `MOCK_USERS` en `constants.ts`).
- Vista **admin** puede seguir cargando **todos** los posts (lógica distinta al feed paginado público).
- Suscripción **realtime** a `posts` para admin/moderación puede seguir **sin filtrar** por canal en el mismo grado que el feed paginado (convivencia con la paginación es un tema a refinar si hiciera falta).

---

## 7. Próximos pasos sugeridos (backlog)

1. Aplicar en producción la migración `comment_counts_for_posts_rpc.sql` y verificar en logs que no se use el fallback salvo error real.
2. Ir migrando pantallas de `useApp()` a hooks granulares (`useAuth`, `useCommunity`, etc.) donde el perfilado muestre re-renders innecesarios.
3. **Opcional:** Parte del feed como **Server Components** o datos iniciales desde el servidor para mejorar TTFB y reducir JS en cliente.
4. **Opcional:** Persistir configuración de app en servidor o perfil, en lugar de solo `localStorage`.
5. **Opcional:** Afinar realtime (filtros por comunidad/canal) para alinear con lo que el usuario ve en el feed paginado.

---

## 8. Verificación local

- TypeScript: `npx tsc --noEmit` (sin errores tras el refactor de providers).
- Build de Next puede fallar en algunos entornos Windows por permisos al escribir `.next/trace`; eso es independiente de estos cambios.

---

*Última actualización: paginación del feed, RPC de conteos, contextos (auth / config / categorías / comunidad) y `useApp` como fachada.*
