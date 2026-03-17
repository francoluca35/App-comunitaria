# Análisis global: rama notificaciones (semana2/1-notificaciones)

Documento de análisis del trabajo realizado en la rama **semana2/1-notificaciones** durante las últimas dos semanas. Incluye funcionalidades de notificaciones, PWA, perfil/configuración, publicidades y mejoras de admin.

---

## 1. Resumen ejecutivo

Se implementó un **sistema completo de notificaciones** (en app y en la barra del sistema), soporte **PWA** (manifest + service worker), **separación Perfil / Configuración** con edición de datos personales, **preferencias de notificaciones** por usuario, **notificaciones en tiempo real** vía Supabase Realtime, y mejoras en **publicidades** y **mensaje de bienvenida** para admin. Todo ello apoyado en migraciones SQL (tabla `notifications`, triggers, preferencias en `profiles`) y APIs REST.

**Alcance aproximado:** 36 archivos tocados, ~2.300 líneas añadidas y ~106 eliminadas.

---

## 2. Sistema de notificaciones

### 2.1 Base de datos

- **Tabla `notifications`** (`notifications_table_and_triggers.sql`):
  - Campos: `id`, `user_id`, `type`, `title`, `body`, `link_url`, `related_id`, `read_at`, `created_at`.
  - Tipos: `message`, `comment`, `post_approved`, `post_rejected`, `post_deleted`, `post_pending`, y más adelante `new_profile`.
  - Índices para consultas por usuario y por lectura/fecha.
  - RLS: usuarios solo leen y actualizan (marcar leídas) sus propias notificaciones; los inserts los hacen triggers con `security definer`.

- **Triggers que generan notificaciones:**
  - **Mensaje de chat** → notifica al receptor (`notify_on_chat_message`).
  - **Nuevo comentario** → notifica al autor del post (si no es el mismo usuario) (`notify_on_comment`).
  - **Nueva publicación pendiente** → notifica a todos los admin/moderador (`notify_on_post_pending`).
  - **Post aprobado/rechazado** → notifica al autor (`notify_on_post_status_change`).
  - **Post eliminado** → notifica al autor (`notify_on_post_deleted`).
  - **Nuevo perfil** → notifica a admin/moderador con datos del perfil (`notifications_new_profile.sql`, tipo `new_profile`).

- **Realtime:** la tabla `notifications` se añade a `supabase_realtime` para que la campana se actualice en vivo.

### 2.2 Preferencias de notificaciones

- **Columna en `profiles`** (`profiles_notification_preference.sql`): `notification_preference` con valores `'all' | 'custom' | 'messages_only'` o `NULL` (aún no eligió).
- **API** `PATCH /api/profile/notifications`: actualiza la preferencia del usuario autenticado.
- **Modal al primer uso** (`NotificationPreferenceModal`): pregunta qué notificaciones recibir; se puede cerrar con “Más tarde” y cambiar después en Configuración.
- **Página Configuración** (`/configuracion`): modo oscuro + opciones de notificaciones (Todas / Personalizado / Solo mensajes).

### 2.3 API REST

- **`GET /api/notifications`**: lista notificaciones del usuario (ordenadas por fecha, con límite).
- **`PATCH /api/notifications`**: marcar como leídas (por `ids` o “todas”).
- Autenticación por Bearer token; RLS en Supabase garantiza aislamiento por usuario.

### 2.4 UI y tiempo real

- **NotificationBell** (`NotificationBell.tsx`):
  - Campana en el sidebar con contador de no leídas.
  - Popover con lista de notificaciones, iconos por tipo, tiempo relativo y enlace a `link_url`.
  - Para tipo `new_profile`, botón “Enviar bienvenida” que llama a la API de mensaje de bienvenida.
  - Suscripción Realtime a inserciones en `notifications` para el usuario actual (lista se actualiza al instante).

- **RealtimeNotificationSubscriptions** (`RealtimeNotificationSubscriptions.tsx`):
  - **Viewers** (con preferencia `all` o `custom`): notificaciones de sistema cuando se aprueba, rechaza o elimina su publicación (Realtime sobre `posts`).
  - **Admin/Moderator**: notificaciones cuando hay nueva publicación pendiente o nuevo perfil; también mensajes de chat (según lógica en providers/chat).
  - Usa `showSystemNotification()` de `lib/notifications.ts` para la barra del sistema (móvil/PC).

### 2.5 Notificaciones del sistema (barra del SO)

- **`lib/notifications.ts`**: helpers para permisos, solicitud de permiso y `showSystemNotification()` (vía Service Worker si existe, sino `new Notification()`).
  - Icono y tag configurables; opcionalmente `url` para abrir al hacer clic.
- El Service Worker (`public/sw.js`) está preparado para mostrar notificaciones cuando la app está en segundo plano (PWA).

---

## 3. PWA (Progressive Web App)

- **`public/manifest.json`**: nombre, short_name, descripción, `start_url`, `display: standalone`, colores, orientación, iconos (192 y 512) y categorías para instalación en dispositivo.
- **`public/sw.js`**: Service Worker básico para caché y soporte de `showNotification` en notificaciones push/barra del sistema.
- **`layout.tsx`**: referencia al manifest y meta/theme para que la app sea instalable y con tema coherente.

---

## 4. Perfil y configuración

### 4.1 Separación Perfil vs Configuración

- **Perfil** (`/profile`): solo datos del usuario (avatar, nombre, email, rol, teléfono, provincia/localidad si existen) y sección **“Modificar datos”** con formulario editable.
- **Configuración** (`/configuracion`): solo preferencias de app: modo oscuro y notificaciones (Todas / Personalizado / Solo mensajes).
- En el **sidebar**, “Configuración” enlaza a `/configuracion` (ya no a `/profile`).

### 4.2 Edición de datos personales

- **API** `PATCH /api/profile`: actualiza `name`, `phone`, `province`, `locality` del perfil del usuario (solo propietario).
- **`/api/auth/me`** y tipo **User** en providers ampliados con `phone`, `province`, `locality` para mostrarlos y editarlos.
- Formulario en Perfil: nombre, teléfono, provincia, localidad y botón “Guardar cambios”; tras guardar se refresca el usuario con `refreshUser()`.

### 4.3 Avatar

- Sin cambios de lógica: sigue siendo subida/eliminación vía `/api/profile/avatar` y diálogo desde la foto en la tarjeta de perfil.

---

## 5. Admin y moderación

### 5.1 Mensaje de bienvenida

- **API** `POST /api/admin/send-welcome-message`: recibe `userId` y envía un mensaje de bienvenida con reglas de la comunidad al chat con ese usuario (solo admin o moderador).
- Usado desde la campana de notificaciones en notificaciones de tipo `new_profile` (botón “Enviar bienvenida”).

### 5.2 Seed de publicaciones demo

- **API** `POST /api/admin/seed-demo-posts`: crea publicaciones de ejemplo para pruebas (solo en entorno controlado; ruta protegida por rol).

### 5.3 Ajustes en páginas de admin

- **admin/page.tsx**: integración con notificaciones y enlace/lógica relacionados con moderación y nuevos perfiles.
- **admin/messages/chat/[userId]/page.tsx**: mejoras para el flujo de chat y enlace desde notificación “nuevo perfil”.
- **admin/publicidades/page.tsx**: pequeños ajustes de UI o datos.

---

## 6. Publicidades

- **PublicidadModal** (`PublicidadModal.tsx`): modal para mostrar una publicidad (imagen/título/texto/CTA).
- **`lib/demo-publicidades.ts`**: datos de publicidades de ejemplo.
- **publicidades/page.tsx**: lista de publicidades y uso del modal; posible integración con datos reales o demo.

---

## 7. Otras migraciones y esquema

- **`profiles_register_fields.sql`**: ya existía; se mantiene/ajusta para `birth_date`, `phone`, `province`, `locality` y trigger de nuevo usuario.
- **`realtime_publication_tables.sql`**: añade tablas necesarias a la publicación Realtime de Supabase (p. ej. para escuchar cambios en `posts`/`notifications`).
- **`security_advisor_fixes.sql`**: correcciones sugeridas por Security Advisor (p. ej. `search_path` en funciones).
- **`ejecutar_en_sql_editor.sql`**: script de apoyo para ejecutar migraciones en el SQL Editor de Supabase.
- **supabase/schema.sql**: actualizaciones puntuales para reflejar nuevas columnas o políticas si aplica.

---

## 8. Archivos nuevos (resumen)

| Área              | Archivos |
|-------------------|----------|
| Notificaciones    | `src/app/api/notifications/route.ts`, `src/app/api/profile/notifications/route.ts`, `src/lib/notifications.ts`, `src/components/NotificationBell.tsx`, `src/components/NotificationPreferenceModal.tsx`, `src/components/RealtimeNotificationSubscriptions.tsx` |
| Perfil/Config     | `src/app/api/profile/route.ts`, `src/app/configuracion/page.tsx` |
| Admin             | `src/app/api/admin/seed-demo-posts/route.ts`, `src/app/api/admin/send-welcome-message/route.ts` |
| Publicidades      | `src/components/PublicidadModal.tsx`, `src/lib/demo-publicidades.ts` |
| PWA               | `public/manifest.json`, `public/sw.js` |
| Migraciones SQL   | `notifications_table_and_triggers.sql`, `notifications_new_profile.sql`, `profiles_notification_preference.sql`, `realtime_publication_tables.sql`, `security_advisor_fixes.sql`, `ejecutar_en_sql_editor.sql` |

---

## 9. Archivos modificados (resumen)

- **Auth y perfil:** `src/app/api/auth/me/route.ts`, `src/lib/auth-api.ts`, `src/app/providers.tsx`, `src/app/profile/page.tsx`.
- **Layout y navegación:** `src/app/layout.tsx`, `src/components/DashboardLayout.tsx`, `src/components/DashboardSidebar.tsx`.
- **Páginas:** `src/app/page.tsx`, `src/app/chat/page.tsx`, `src/app/publicidades/page.tsx`.
- **Admin:** `src/app/admin/page.tsx`, `src/app/admin/publicidades/page.tsx`, `src/app/admin/messages/chat/[userId]/page.tsx`.
- **UI:** `src/app/components/ui/dialog.tsx`.
- **Base de datos:** `supabase/migrations/profiles_register_fields.sql`, `supabase/schema.sql`.

---

## 10. Flujo de usuario destacado

1. **Primer acceso:** modal de preferencia de notificaciones (Todas / Personalizado / Solo mensajes o “Más tarde”).
2. **Campana:** siempre visible en el sidebar; al hacer clic se abre el listado con Realtime; desde una notificación “nuevo perfil” el admin puede “Enviar bienvenida”.
3. **Perfil:** ver datos y editarlos (nombre, teléfono, provincia, localidad) en “Modificar datos”.
4. **Configuración:** cambiar modo oscuro y preferencia de notificaciones sin mezclarla con el perfil.
5. **Eventos en tiempo real:** aprobación/rechazo/eliminación de posts, nuevos mensajes, nuevos comentarios, nuevas publicaciones para moderar y nuevos perfiles generan notificaciones en app y, según preferencia y permisos, en la barra del sistema.

---

## 11. Dependencias de migraciones (orden sugerido)

1. `profiles_register_fields.sql` (phone, province, locality, etc.).
2. `profiles_notification_preference.sql`.
3. `notifications_table_and_triggers.sql`.
4. `notifications_new_profile.sql` (extiende el `type` de notifications).
5. `realtime_publication_tables.sql` (si se usa Realtime en más tablas).
6. `security_advisor_fixes.sql` según recomendaciones del dashboard.

---

*Documento generado a partir del estado de la rama **semana2/1-notificaciones** y de los archivos modificados y añadidos en las últimas dos semanas.*
