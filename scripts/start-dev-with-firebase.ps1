#!/usr/bin/env pwsh
# Helper to load Base64 service account from sa.b64 into
# FIREBASE_SERVICE_ACCOUNT_KEY for local development and start the dev server.

Param()

try {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
} catch {
    $scriptDir = Get-Location
}

$saPath = Join-Path $scriptDir "..\sa.b64"

if (-not (Test-Path $saPath)) {
    Write-Host "sa.b64 not found at $saPath. Start dev normally with 'npm run dev'." -ForegroundColor Yellow
    exit 0
}

$text = Get-Content $saPath -Raw
# Remove markdown fences and whitespace
$b64 = $text -replace '```[^\n]*\n','' -replace '```',''
$b64 = $b64 -replace '\r','' -replace '\n',''
$b64 = $b64.Trim()

if ([string]::IsNullOrWhiteSpace($b64)) {
    Write-Host "No Base64 content found in sa.b64" -ForegroundColor Red
    exit 1
}

# Set environment variable for this session
$env:FIREBASE_SERVICE_ACCOUNT_KEY = $b64
Write-Host "FIREBASE_SERVICE_ACCOUNT_KEY set from sa.b64 (session only)" -ForegroundColor Green

# Start the Next.js dev server
npm run dev
