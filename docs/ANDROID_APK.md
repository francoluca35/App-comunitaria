# App Android CST (TWA) — sin aviso de Play Protect

Google Play Protect bloquea APKs con **`targetSdkVersion` bajo** (típicamente &lt; 34). El proyecto `android/` compila una **Trusted Web Activity** con **API 35**.

## Build automático (recomendado)

En la raíz del repo, con **Android Studio / Android SDK** instalado:

```bash
npm run android:release
```

El script (`scripts/android-build-release.ps1`):

1. Crea el keystore si no existe (`android/cst-release.keystore`).
2. Escribe `android/keystore.properties` y `android/KEYSTORE_CREDENTIALS.txt` (contraseña; **no subir a git**).
3. Actualiza `.env.local` con `ANDROID_TWA_SHA256_FINGERPRINTS`.
4. Compila el APK firmado y lo copia a **`dist/CST-comunidad-release.apk`**.

Requisitos en Windows: JDK 17 (usa el JBR de Android Studio), SDK en `%LOCALAPPDATA%\Android\Sdk`.

## Después del build

### 1. Producción (assetlinks)

En el hosting (Vercel, etc.) agregá la misma variable que quedó en `.env.local`:

```env
ANDROID_TWA_SHA256_FINGERPRINTS=…tu huella SHA256…
```

Verificá: `https://www.comunidaddesantotome.com.ar/.well-known/assetlinks.json`

### 2. Distribución

1. Los usuarios **desinstalan** el icono **CST** viejo (Play Protect).
2. Instalan **`dist/CST-comunidad-release.apk`** (WhatsApp, Drive, etc.).
3. O bien: **Chrome → Instalar app** (PWA, sin APK).

> Si el APK anterior tenía **otro** `applicationId`, hay que desinstalar el viejo antes de instalar este.

## Paquete y versiones

| Campo | Valor |
|--------|--------|
| `applicationId` | `ar.com.comunidaddesantotome.cst` |
| `targetSdk` | 35 |
| `versionCode` | 3 (subir en `android/app/build.gradle` en cada release) |

## Manual (Android Studio)

1. **File → Open → `android/`**
2. **Build → Generate Signed Bundle / APK** (keystore en `android/cst-release.keystore`, datos en `keystore.properties`).

## Solución de problemas

- **Ruta con tildes (`Aplicación…`):** ya está `android.overridePathCheck=true` en `gradle.properties`.
- **Sigue Play Protect:** APK viejo en el teléfono → desinstalar e instalar `dist/CST-comunidad-release.apk`.
- **Enlaces abren en Chrome:** falta o está mal `assetlinks.json` en producción.
- **SDK not found:** copiá `local.properties.example` → `local.properties` con tu ruta al SDK.
