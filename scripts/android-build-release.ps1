# Genera keystore (si falta), huella SHA-256, actualiza .env.local y compila APK release firmado.
# Requisitos: JDK (keytool), Android SDK (ANDROID_HOME o %LOCALAPPDATA%\Android\Sdk).

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$AndroidDir = Join-Path $Root 'android'

$JbrHome = 'C:\Program Files\Android\Android Studio\jbr'
if (Test-Path $JbrHome) {
	$env:JAVA_HOME = $JbrHome
	$env:Path = "$JbrHome\bin;$env:Path"
	Write-Host "JAVA_HOME=$JbrHome"
}

$Keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
if (-not (Test-Path $Keytool)) {
	$Keytool = 'C:\Program Files\Java\jdk-23\bin\keytool.exe'
}
if (-not (Test-Path $Keytool)) {
	$Keytool = 'C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe'
}
if (-not (Test-Path $Keytool)) {
	throw 'No se encontró keytool. Instalá JDK 17+ o Android Studio.'
}

$sdkDir = $env:ANDROID_HOME
if (-not $sdkDir) {
	$sdkDir = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}
if (-not (Test-Path $sdkDir)) {
	throw "No se encontró Android SDK en $sdkDir"
}

$localProps = Join-Path $AndroidDir 'local.properties'
$sdkForProps = $sdkDir -replace '\\', '/'
"sdk.dir=$sdkForProps" | Set-Content -Path $localProps -Encoding ASCII
$env:ANDROID_HOME = $sdkDir

$keystoreFile = Join-Path $AndroidDir 'cst-release.keystore'
$propsFile = Join-Path $AndroidDir 'keystore.properties'
$credsFile = Join-Path $AndroidDir 'KEYSTORE_CREDENTIALS.txt'

if (-not (Test-Path $keystoreFile)) {
	$pass = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
	$dname = 'CN=CST Comunidad, OU=Mobile, O=Comunidad Santo Tome, L=Santo Tome, ST=SF, C=AR'
	& $Keytool -genkey -v `
		-keystore $keystoreFile `
		-alias cst `
		-keyalg RSA -keysize 2048 -validity 10000 `
		-storepass $pass -keypass $pass `
		-dname $dname
	[System.IO.File]::WriteAllLines($propsFile, @(
		'storeFile=cst-release.keystore',
		"storePassword=$pass",
		"keyPassword=$pass",
		'keyAlias=cst'
	), (New-Object System.Text.UTF8Encoding $false))
	@(
		'Credenciales del keystore CST (NO subir a git)',
		"Archivo: android/cst-release.keystore",
		"Alias: cst",
		"Contraseña (store y key): $pass",
		'',
		'Guardá este archivo en un gestor de contraseñas y borrálo del disco si querés.'
	) | Set-Content -Path $credsFile -Encoding UTF8
	Write-Host "Keystore creado. Contraseña guardada en android/KEYSTORE_CREDENTIALS.txt"
} elseif (-not (Test-Path $propsFile)) {
	throw 'Existe cst-release.keystore pero falta keystore.properties. Copiá keystore.properties.example y completá.'
}

$props = @{}
Get-Content $propsFile | ForEach-Object {
	if ($_ -match '^\s*([^#=]+)=(.*)$') { $props[$matches[1].Trim()] = $matches[2].Trim() }
}

$listing = & $Keytool -list -v -keystore $keystoreFile -alias $props['keyAlias'] -storepass $props['storePassword'] 2>&1 | Out-String
if ($listing -notmatch 'SHA256:\s*([0-9A-F:]+)') {
	throw 'No se pudo leer SHA256 del keystore.'
}
$fingerprint = $Matches[1].Trim()
Write-Host "SHA256: $fingerprint"

$envLocal = Join-Path $Root '.env.local'
$envLine = "ANDROID_TWA_SHA256_FINGERPRINTS=$fingerprint"
if (Test-Path $envLocal) {
	$lines = Get-Content $envLocal -Encoding UTF8
	$filtered = $lines | Where-Object { $_ -notmatch '^\s*ANDROID_TWA_SHA256_FINGERPRINTS=' }
	$filtered + $envLine | Set-Content -Path $envLocal -Encoding UTF8
} else {
	$envLine | Set-Content -Path $envLocal -Encoding UTF8
}
Write-Host 'Actualizado .env.local con ANDROID_TWA_SHA256_FINGERPRINTS'

$gradleZip = Join-Path $env:TEMP 'gradle-8.9-bin.zip'
$gradleExtractRoot = Join-Path $env:TEMP 'gradle-8.9'
$gradleBat = Join-Path $gradleExtractRoot 'bin\gradle.bat'
if (-not (Test-Path $gradleBat)) {
	Write-Host 'Descargando Gradle 8.9...'
	Invoke-WebRequest -Uri 'https://services.gradle.org/distributions/gradle-8.9-bin.zip' -OutFile $gradleZip -UseBasicParsing
	if (Test-Path $gradleExtractRoot) { Remove-Item $gradleExtractRoot -Recurse -Force }
	Expand-Archive -Path $gradleZip -DestinationPath $env:TEMP -Force
}
if (-not (Test-Path $gradleBat)) {
	throw "Gradle no encontrado en $gradleBat"
}
Push-Location $AndroidDir
try {
	$gradlew = Join-Path $AndroidDir 'gradlew.bat'
	if (-not (Test-Path $gradlew)) {
		Write-Host 'Generando Gradle Wrapper...'
		& $gradleBat wrapper --gradle-version 8.9
	}
	if (Test-Path $gradlew) {
		& $gradlew assembleRelease --no-daemon
	} else {
		& $gradleBat assembleRelease --no-daemon
	}
	$apk = Get-ChildItem -Path 'app\build\outputs\apk\release' -Filter '*.apk' -Recurse | Select-Object -First 1
	if ($apk) {
		$out = Join-Path $Root 'dist'
		New-Item -ItemType Directory -Force -Path $out | Out-Null
		$dest = Join-Path $out 'CST-comunidad-release.apk'
		Copy-Item $apk.FullName $dest -Force
		Write-Host "APK listo: $dest"
	} else {
		throw 'No se generó APK en app/build/outputs/apk/release'
	}
} finally {
	Pop-Location
}
