# Webhook de push para alertas (`/api/push/webhook`)

Cuando un admin **aprueba** una publicación categoría **alertas**, el trigger de Postgres inserta filas en `notifications` (tipo `community_alert`). Para **personas extraviadas** (categoría **extravios**) el tipo es `community_alert_critical`; el mismo webhook envía Web Push con marca `critical` para refuerzo (p. ej. punto en el icono de la PWA donde el navegador lo soporte).

Además, cada **mensaje de chat** inserta una fila en `notifications` con `type = message` (título = nombre del remitente, cuerpo = vista previa, `link_url` al hilo). El **mismo** webhook envía Web Push al destinatario para que suene / vibre **aunque la app esté cerrada** (misma suscripción `push_subscriptions` que para alertas).

Este webhook debe recibir **todos** los INSERT en `notifications` (no filtrar solo alertas en el panel de Supabase). Los tipos que no son alerta ni mensaje responden `skipped` sin error.

## 1. Requisitos previos

- Migración aplicada: `supabase/migrations/push_subscriptions.sql` (tabla `push_subscriptions`).
- Variables en el hosting (Vercel, etc.) y en `.env.local`:

| Variable | Descripción |
|----------|-------------|
| `PUSH_WEBHOOK_SECRET` | Secreto largo y aleatorio (ej. `openssl rand -hex 32`). **Mismo valor** en el header del webhook. |
| `SUPABASE_SERVICE_ROLE_KEY` | Para leer `push_subscriptions` desde la API. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Par VAPID (`npx web-push generate-vapid-keys`). |
| `VAPID_PRIVATE_KEY` | Clave privada del par. |
| `VAPID_SUBJECT` | `mailto:tu@dominio.com` (obligatorio por el estándar Web Push). |

## 2. Crear el Database Webhook en Supabase

1. Entrá al proyecto: **[Supabase Dashboard](https://supabase.com/dashboard)** → tu proyecto.
2. Menú **Database** → **Webhooks** (o **Integrations** → **Database Webhooks**, según la versión del panel).
3. **Create a new webhook**.
4. Configuración recomendada:
   - **Name:** `push-community-alert` (o el que quieras).
   - **Table:** `notifications`.
   - **Events:** solo **Insert** (no hace falta UPDATE/DELETE para este flujo).
   - **Type of webhook:** `HTTP Request`.
   - **Method:** `POST`.
   - **URL:** URL pública de producción, por ejemplo  
     `https://www.comunidaddesantotome.com.ar/api/push/webhook`  
     (debe ser **HTTPS** en producción).

## 3. Secreto (obligatorio)

En **HTTP Headers** del webhook en Supabase tenés que tener **al menos dos** filas:

| Header name | Value |
|-------------|--------|
| `Content-Type` | `application/json` (suele venir por defecto) |
| `x-webhook-secret` | **El mismo valor** que configuraste en Vercel como `PUSH_WEBHOOK_SECRET` |

Si solo dejás `Content-Type`, la app responde **401 No autorizado** y no se envía ningún push.

**Alternativa** en lugar de `x-webhook-secret`:

| Header name | Value |
|-------------|--------|
| `Authorization` | `Bearer TU_SECRETO` (mismo secreto que `PUSH_WEBHOOK_SECRET`) |

Generá un secreto fuerte, por ejemplo: `openssl rand -hex 32`. Copiá el resultado en **Vercel → Environment Variables → `PUSH_WEBHOOK_SECRET`** y **exactamente el mismo** en el header del webhook.

## 4. Cuerpo del POST

No tenés que armar el JSON a mano: Supabase envía automáticamente el payload estándar, por ejemplo:

```json
{
  "type": "INSERT",
  "table": "notifications",
  "schema": "public",
  "record": {
    "id": "...",
    "user_id": "...",
    "type": "community_alert",
    "title": "¡Alerta! ...",
    "body": "...",
    "link_url": "/post/...",
    "related_id": "...",
    "read_at": null,
    "created_at": "..."
  },
  "old_record": null
}
```

La API procesa `type === "INSERT"`, tabla `notifications`, y `record.type` igual a **`community_alert`**, **`community_alert_critical`** o **`message`** (chat). El resto responde `200` con `skipped: true` (así Supabase no reintenta como error).

### Mensajes de chat (`message`)

- El payload del push usa el **nombre del remitente** como título y la **vista previa** como cuerpo (lo que ya guarda el trigger `notify_on_chat_message`).
- `tag: chat-peer-{sender_id}` agrupa por conversación en Android (se actualiza la misma notificación; `renotify` ayuda a que vuelva a alertar según el dispositivo).
- El **sonido** lo define el sistema / canal de notificaciones del navegador o de la PWA (`silent: false` en el service worker), igual que con las alertas.

## 5. Probar

- **GET** `https://www.comunidaddesantotome.com.ar/api/push/webhook` → JSON con `ready: true/false` (secreto + VAPID).
- Después de aprobar una alerta, revisá logs del hosting y, en Supabase, el historial de webhooks / `net` si hay fallos de red.

## 6. Desarrollo local

El webhook de Supabase se ejecuta **desde el servidor de Postgres** (Docker). `localhost` apunta al contenedor, no a tu PC. Para probar contra Next en tu máquina usá **ngrok**, **Cloudflare Tunnel**, o una URL pública de preview. En producción usá el dominio definitivo (`https://www.comunidaddesantotome.com.ar`).

## 7. Usuarios finales

Cada usuario debe **aceptar notificaciones** en el navegador; la app registra la suscripción en `push_subscriptions`. Sin filas para ese `user_id`, el webhook responde `sent: 0`.
