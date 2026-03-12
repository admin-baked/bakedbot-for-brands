#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [string]$ProjectId = "studio-567050101-bc6e8",
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host $Message -ForegroundColor Cyan
}

function Fail([string]$Message) {
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Assert-LastExitCode([string]$Message) {
    if ($LASTEXITCODE -ne 0) {
        Fail $Message
    }
}

function Remove-PathIfExists([string]$Path, [switch]$Recurse) {
    if (-not (Test-Path $Path)) {
        return
    }

    try {
        if ($Recurse) {
            Remove-Item $Path -Recurse -Force
        } else {
            Remove-Item $Path -Force
        }
    } catch {
        Write-Host "WARN: Failed to remove $Path. $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

function Get-NodeExecutable() {
    if (-not [string]::IsNullOrWhiteSpace($env:npm_node_execpath) -and (Test-Path $env:npm_node_execpath)) {
        return $env:npm_node_execpath
    }

    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if ($null -ne $nodeCommand) {
        return $nodeCommand.Source
    }

    return $null
}

function Write-Utf8File([string]$Path, [string]$Content) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Get-ServiceAccountCredentialSource([string]$RepoRoot, [string]$TempDir) {
    $serviceAccountJsonPath = Join-Path $RepoRoot "service-account.json"
    if (Test-Path $serviceAccountJsonPath) {
        return @{
            Path = $serviceAccountJsonPath
            Temporary = $false
        }
    }

    $encodedSource = $null
    $saPath = Join-Path $RepoRoot "sa.b64"
    if (Test-Path $saPath) {
        $encodedSource = (Get-Content $saPath -Raw) -replace '```[^\n]*\n', '' -replace '```', ''
    } elseif (-not [string]::IsNullOrWhiteSpace($env:FIREBASE_SERVICE_ACCOUNT_KEY)) {
        $encodedSource = $env:FIREBASE_SERVICE_ACCOUNT_KEY
    } else {
        $envLocalPath = Join-Path $RepoRoot ".env.local"
        if (Test-Path $envLocalPath) {
            $match = Select-String -Path $envLocalPath -Pattern '^FIREBASE_SERVICE_ACCOUNT_KEY=(.+)$' | Select-Object -First 1
            if ($null -ne $match) {
                $encodedSource = $match.Matches[0].Groups[1].Value
            }
        }
    }

    if ([string]::IsNullOrWhiteSpace($encodedSource)) {
        return $null
    }

    $encodedSource = $encodedSource.Trim()
    $decodedJson = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encodedSource))
    $tempCredentialPath = Join-Path $TempDir "firebase-service-account.json"
    Write-Utf8File -Path $tempCredentialPath -Content $decodedJson

    return @{
        Path = $tempCredentialPath
        Temporary = $true
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$envConfigPath = Join-Path $repoRoot "env-config.json"
$tempDir = Join-Path $env:TEMP "bakedbot-firebase-deploy-check"
$sourcePath = Join-Path $tempDir "source.txt"
$linkPath = Join-Path $tempDir "link.txt"
$firebaseConfigDir = Join-Path $tempDir "firebase-appdata"
$createdEnvConfig = $false
$serviceAccountCredential = $null
$originalAppData = $env:APPDATA
$originalXdgConfigHome = $env:XDG_CONFIG_HOME
$originalXdgDataHome = $env:XDG_DATA_HOME
$originalXdgCacheHome = $env:XDG_CACHE_HOME
$originalGoogleApplicationCredentials = $env:GOOGLE_APPLICATION_CREDENTIALS
$originalCloudSdkCredentialOverride = $env:CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE
$originalGoogleCloudProject = $env:GOOGLE_CLOUD_PROJECT
$originalGCloudProject = $env:GCLOUD_PROJECT
$originalCi = $env:CI

Push-Location $repoRoot

try {
    Write-Step "Checking Node.js version"
    $nodeExecutable = Get-NodeExecutable
    if ([string]::IsNullOrWhiteSpace($nodeExecutable)) {
        Fail "Node.js is required to deploy."
    }

    $nodeVersionOutput = & $nodeExecutable -p "process.versions.node" 2>$null
    Assert-LastExitCode "Node.js is required to deploy."

    $nodeVersion = ($nodeVersionOutput | Select-Object -First 1).Trim()
    if ([string]::IsNullOrWhiteSpace($nodeVersion)) {
        Fail "Unable to determine the active Node.js version."
    }

    $nodeMajor = [int]($nodeVersion.Split(".")[0])
    if ($nodeMajor -ne 20) {
        Fail "Node 20 is required for local Firebase deploy parity. Current version: v$nodeVersion"
    }

    Write-Step "Checking Firebase CLI"
    firebase --version | Out-Null
    Assert-LastExitCode "Firebase CLI is required. Install it before running this script."

    Write-Step "Checking Windows symlink support"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    "ok" | Set-Content -Path $sourcePath -Encoding ASCII
    if (Test-Path $linkPath) {
        Remove-Item $linkPath -Force
    }
    cmd /c "mklink `"$linkPath`" `"$sourcePath`"" | Out-Null
    Assert-LastExitCode "Symbolic link creation failed. Enable Windows Developer Mode before deploying."

    Write-Step "Preparing Firebase auth"
    New-Item -ItemType Directory -Path $firebaseConfigDir -Force | Out-Null
    $serviceAccountCredential = Get-ServiceAccountCredentialSource -RepoRoot $repoRoot -TempDir $tempDir
    if ($null -ne $serviceAccountCredential) {
        $env:APPDATA = $firebaseConfigDir
        $env:XDG_CONFIG_HOME = $firebaseConfigDir
        $env:XDG_DATA_HOME = $firebaseConfigDir
        $env:XDG_CACHE_HOME = $firebaseConfigDir
        $env:GOOGLE_APPLICATION_CREDENTIALS = $serviceAccountCredential.Path
        $env:CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE = $serviceAccountCredential.Path
        $env:GOOGLE_CLOUD_PROJECT = $ProjectId
        $env:GCLOUD_PROJECT = $ProjectId
        $env:CI = "true"
    } else {
        Write-Host "WARN: No local service-account credentials found. Firebase CLI will use the signed-in user." -ForegroundColor Yellow
    }

    if (-not (Test-Path $envConfigPath) -and -not [string]::IsNullOrWhiteSpace($env:SERPER_API_KEY)) {
        Write-Step "Creating env-config.json from current environment"
        @{ SERPER_API_KEY = $env:SERPER_API_KEY } |
            ConvertTo-Json -Compress |
            Set-Content -Path $envConfigPath -Encoding ASCII
        $createdEnvConfig = $true
    }

    if (-not $SkipInstall) {
        Write-Step "Installing dependencies"
        npm install --legacy-peer-deps
        Assert-LastExitCode "Dependency installation failed."
    }

    Write-Step "Running production build"
    npm run build
    Assert-LastExitCode "Production build failed."

    Write-Step "Deploying to Firebase"
    $env:FIREBASE_CLI_EXPERIMENTS = "webframeworks"
    firebase deploy --project $ProjectId --force --only "hosting,functions" --non-interactive
    Assert-LastExitCode "Firebase deploy failed."

    Write-Host "OK: Firebase deploy completed for $ProjectId" -ForegroundColor Green
}
finally {
    Remove-PathIfExists -Path $linkPath
    Remove-PathIfExists -Path $sourcePath

    if ($null -ne $serviceAccountCredential -and $serviceAccountCredential.Temporary) {
        Remove-PathIfExists -Path $serviceAccountCredential.Path
    }

    Remove-PathIfExists -Path $tempDir -Recurse

    if ($createdEnvConfig) {
        Remove-PathIfExists -Path $envConfigPath
    }

    $env:APPDATA = $originalAppData
    $env:XDG_CONFIG_HOME = $originalXdgConfigHome
    $env:XDG_DATA_HOME = $originalXdgDataHome
    $env:XDG_CACHE_HOME = $originalXdgCacheHome
    $env:GOOGLE_APPLICATION_CREDENTIALS = $originalGoogleApplicationCredentials
    $env:CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE = $originalCloudSdkCredentialOverride
    $env:GOOGLE_CLOUD_PROJECT = $originalGoogleCloudProject
    $env:GCLOUD_PROJECT = $originalGCloudProject
    $env:CI = $originalCi

    Pop-Location
}
