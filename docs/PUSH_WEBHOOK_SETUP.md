# Webhook de push para alertas (`/api/push/webhook`)

Cuando un admin **aprueba** una publicación categoría **alertas**, el trigger de Postgres inserta filas en `notifications` (tipo `community_alert`). Este webhook recibe cada INSERT y envía **Web Push** al dispositivo del usuario destinatario.

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
     `https://TU_DOMINIO.vercel.app/api/push/webhook`  
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

La API solo procesa `type === "INSERT"`, tabla `notifications`, y `record.type === "community_alert"`. El resto responde `200` con `skipped: true` (así Supabase no reintenta como error).

## 5. Probar

- **GET** `https://TU_DOMINIO/api/push/webhook` → JSON con `ready: true/false` (secreto + VAPID).
- Después de aprobar una alerta, revisá logs del hosting y, en Supabase, el historial de webhooks / `net` si hay fallos de red.

## 6. Desarrollo local

El webhook de Supabase se ejecuta **desde el servidor de Postgres** (Docker). `localhost` apunta al contenedor, no a tu PC. Para probar contra Next en tu máquina usá **ngrok**, **Cloudflare Tunnel**, o la URL de preview de Vercel.

## 7. Usuarios finales

Cada usuario debe **aceptar notificaciones** en el navegador; la app registra la suscripción en `push_subscriptions`. Sin filas para ese `user_id`, el webhook responde `sent: 0`.
