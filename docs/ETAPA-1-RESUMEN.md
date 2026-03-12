# Primera etapa – Resumen de lo realizado

## 1. Sidebar fijo en desktop
- El menú lateral (CST Comunidad, Inicio, Perfil, categorías, etc.) queda **fijo** en pantallas grandes al hacer scroll.
- En `DashboardLayout`: se quitó `lg:static` del sidebar y se añadió `lg:ml-64` al contenido central para que no quede debajo del menú.

## 2. Foto de perfil al registrarse (Inicio)
- Si el usuario está logueado y **no tiene avatar**, en la página **Inicio** se muestra un **modal** pidiendo agregar foto de perfil.
- El modal permite subir una imagen (JPG, PNG, WebP, máx. 2 MB) o cerrar con "Más tarde".
- La imagen se guarda en **Supabase Storage** (bucket `avatars`) y la URL en `profiles.avatar_url`.

## 3. Storage y políticas para avatares
- **Bucket:** `avatars` (crear en Supabase Dashboard, público).
- **Migración:** `supabase/migrations/avatars_storage.sql` con políticas de lectura pública y subida/actualización/borrado solo en la carpeta del usuario (`avatars/{auth.uid()}/...`).
- En la API se usa **service role** solo para operaciones de Storage (el token del usuario no llega bien a Storage desde el servidor). Cualquier usuario autenticado puede cambiar su foto; no se exige ningún rol.

## 4. API de avatar
- **POST `/api/profile/avatar`:** recibe imagen (campo `avatar` o `file`), borra la anterior en Storage si existe, sube la nueva a `avatars/{userId}/{uuid}.ext`, actualiza `profiles.avatar_url` y devuelve la URL.
- **DELETE `/api/profile/avatar`:** elimina el archivo actual en Storage (si es del bucket avatars) y pone `profiles.avatar_url` en `null`.
- Requiere `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` para las operaciones de Storage.

## 5. Contexto (providers)
- Se añadió **`refreshUser()`** al contexto de la app para volver a cargar el perfil desde la API (p. ej. después de subir o eliminar la foto) y actualizar `currentUser` en toda la app.

## 6. Avatar en el sidebar
- En el **header del sidebar** (arriba, junto a "CST Comunidad") se muestra el **avatar del usuario** si está logueado: foto de perfil o inicial en un círculo. Si no hay usuario, se mantiene el ícono de comunidad.

## 7. Perfil: modal al hacer clic en la foto
- En la página **Perfil**, al hacer clic en el círculo de la foto:
  - Se abre un **modal** con la foto **en grande** (o la inicial si no hay imagen).
  - Dos botones en columna: **Cambiar foto** (arriba) y **Eliminar foto** (abajo).
- **Cambiar foto:** cierra el modal, abre el selector de archivos y sube la nueva imagen con POST `/api/profile/avatar`.
- **Eliminar foto:** llama a DELETE `/api/profile/avatar`, actualiza el perfil y cierra el modal. El botón se deshabilita si no hay foto.

## 8. Ajustes de UI
- **Círculo que se deformaba:** el avatar en la tarjeta de Perfil dejó de ser un `<button>`; ahora es un `<div>` con tamaño fijo (`w-24 h-24`), `rounded-full` y `overflow-hidden` para que el círculo no se deforme al hacer clic.
- **Orden de botones en el modal:** "Cambiar foto" arriba y "Eliminar foto" abajo, siempre en columna (se forzó `sm:flex-col` en el `DialogFooter` para que no pasen a fila en pantallas grandes).

---

*Resumen de la primera etapa – foto de perfil, storage, sidebar y flujo en Inicio/Perfil.*
