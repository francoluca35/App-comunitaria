# Mata servidores Next en puertos habituales, borra caché .next y arranca un solo `npm run dev`.
$ErrorActionPreference = 'SilentlyContinue'
$Root = Split-Path $PSScriptRoot -Parent
$ports = 3000, 3001, 3002, 3003

foreach ($port in $ports) {
	$lines = netstat -ano | Select-String ":$port\s"
	foreach ($line in $lines) {
		if ($line -match '\s+(\d+)\s*$') {
			$pid = [int]$Matches[1]
			if ($pid -gt 0) {
				Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
			}
		}
	}
}

Start-Sleep -Seconds 2
$nextDir = Join-Path $Root '.next'
if (Test-Path $nextDir) {
	Remove-Item $nextDir -Recurse -Force -ErrorAction SilentlyContinue
	Write-Host "Caché .next eliminada."
}

Set-Location $Root
Write-Host "Iniciando servidor (Turbopack) en http://localhost:3000 ..."
npm run dev
