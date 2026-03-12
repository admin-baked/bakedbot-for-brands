#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [string]$ProjectId = "studio-567050101-bc6e8",
    [switch]$SkipInstall,
    [switch]$SkipFieldOverrideDriftCheck
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

function Get-NormalizedFieldOverrideIndexTokens([object[]]$Indexes) {
    $tokens = New-Object System.Collections.Generic.List[string]

    foreach ($index in @($Indexes)) {
        if ($null -eq $index) {
            continue
        }

        $queryScope = "COLLECTION"
        if ($index.PSObject.Properties.Name -contains "queryScope" -and -not [string]::IsNullOrWhiteSpace([string]$index.queryScope)) {
            $queryScope = [string]$index.queryScope
        }

        $order = $null
        $arrayConfig = $null

        if ($index.PSObject.Properties.Name -contains "order") {
            $order = [string]$index.order
        }

        if ($index.PSObject.Properties.Name -contains "arrayConfig") {
            $arrayConfig = [string]$index.arrayConfig
        }

        if (($null -eq $order) -and ($null -eq $arrayConfig) -and ($index.PSObject.Properties.Name -contains "fields")) {
            $indexFields = @($index.fields)
            if ($indexFields.Count -gt 0) {
                $fieldConfig = $indexFields[0]
                if ($fieldConfig.PSObject.Properties.Name -contains "order") {
                    $order = [string]$fieldConfig.order
                }
                if ($fieldConfig.PSObject.Properties.Name -contains "arrayConfig") {
                    $arrayConfig = [string]$fieldConfig.arrayConfig
                }
            }
        }

        if (-not [string]::IsNullOrWhiteSpace($order)) {
            $tokens.Add("$queryScope|ORDER|$($order.ToUpperInvariant())")
            continue
        }

        if (-not [string]::IsNullOrWhiteSpace($arrayConfig)) {
            $tokens.Add("$queryScope|ARRAY|$($arrayConfig.ToUpperInvariant())")
        }
    }

    return @($tokens | Sort-Object -Unique)
}

function Get-FieldOverrideIdentity([string]$FieldResourceName) {
    if ([string]::IsNullOrWhiteSpace($FieldResourceName)) {
        return $null
    }

    $collectionGroupParts = $FieldResourceName -split "/collectionGroups/", 2
    if ($collectionGroupParts.Count -ne 2) {
        return $null
    }

    $fieldParts = $collectionGroupParts[1] -split "/fields/", 2
    if ($fieldParts.Count -ne 2) {
        return $null
    }

    return @{
        CollectionGroup = $fieldParts[0]
        FieldPath = $fieldParts[1]
    }
}

function Convert-ProductionFieldOverride([object]$FieldConfig) {
    if ($null -eq $FieldConfig) {
        return $null
    }

    $identity = Get-FieldOverrideIdentity -FieldResourceName ([string]$FieldConfig.name)
    if ($null -eq $identity) {
        return $null
    }

    if ($identity.CollectionGroup -eq "__default__" -and $identity.FieldPath -eq "*") {
        return $null
    }

    $ttlEnabled = $false
    if ($FieldConfig.PSObject.Properties.Name -contains "ttlConfig" -and $null -ne $FieldConfig.ttlConfig) {
        $ttlState = [string]$FieldConfig.ttlConfig.state
        $ttlEnabled = -not [string]::IsNullOrWhiteSpace($ttlState) -and $ttlState -ne "STATE_UNSPECIFIED"
    }

    return [pscustomobject]@{
        collectionGroup = $identity.CollectionGroup
        fieldPath = $identity.FieldPath
        ttl = $ttlEnabled
        indexTokens = @(Get-NormalizedFieldOverrideIndexTokens -Indexes $FieldConfig.indexConfig.indexes)
    }
}

function Convert-LocalFieldOverride([object]$FieldConfig) {
    if ($null -eq $FieldConfig) {
        return $null
    }

    $ttlEnabled = $false
    if ($FieldConfig.PSObject.Properties.Name -contains "ttl") {
        $ttlEnabled = [bool]$FieldConfig.ttl
    } elseif ($FieldConfig.PSObject.Properties.Name -contains "ttlConfig" -and $null -ne $FieldConfig.ttlConfig) {
        $ttlState = [string]$FieldConfig.ttlConfig.state
        $ttlEnabled = -not [string]::IsNullOrWhiteSpace($ttlState) -and $ttlState -ne "STATE_UNSPECIFIED"
    }

    return [pscustomobject]@{
        collectionGroup = [string]$FieldConfig.collectionGroup
        fieldPath = [string]$FieldConfig.fieldPath
        ttl = $ttlEnabled
        indexTokens = @(Get-NormalizedFieldOverrideIndexTokens -Indexes $FieldConfig.indexes)
    }
}

function Convert-FieldOverrideToExportShape([object]$FieldOverride) {
    $exportShape = [ordered]@{
        collectionGroup = $FieldOverride.collectionGroup
        fieldPath = $FieldOverride.fieldPath
    }

    if ($FieldOverride.ttl) {
        $exportShape.ttl = $true
    }

    $indexes = New-Object System.Collections.Generic.List[object]
    foreach ($token in @($FieldOverride.indexTokens)) {
        $parts = $token -split "\|", 3
        if ($parts.Count -ne 3) {
            continue
        }

        if ($parts[1] -eq "ORDER") {
            $indexes.Add([ordered]@{
                queryScope = $parts[0]
                order = $parts[2]
            })
            continue
        }

        if ($parts[1] -eq "ARRAY") {
            $indexes.Add([ordered]@{
                queryScope = $parts[0]
                arrayConfig = $parts[2]
            })
        }
    }

    $exportShape.indexes = @($indexes)
    return [pscustomobject]$exportShape
}

function Get-LocalFieldOverrides([string]$FirestoreIndexesPath) {
    if (-not (Test-Path $FirestoreIndexesPath)) {
        Fail "Missing Firestore indexes config at $FirestoreIndexesPath"
    }

    $config = Get-Content $FirestoreIndexesPath -Raw | ConvertFrom-Json
    $localOverrides = New-Object System.Collections.Generic.List[object]

    foreach ($fieldOverride in @($config.fieldOverrides)) {
        $normalized = Convert-LocalFieldOverride -FieldConfig $fieldOverride
        if ($null -ne $normalized) {
            $localOverrides.Add($normalized)
        }
    }

    return @($localOverrides)
}

function Get-ProductionFieldOverrides([string]$ProjectId) {
    $gcloudCommand = Get-Command gcloud -ErrorAction SilentlyContinue
    if ($null -eq $gcloudCommand) {
        Fail "gcloud CLI is required to verify Firestore single-field overrides before deploying."
    }

    $gcloudOutput = & $gcloudCommand.Source firestore indexes fields list --database "(default)" --project $ProjectId --format json --quiet 2>&1
    if ($LASTEXITCODE -ne 0) {
        $details = ($gcloudOutput | Out-String).Trim()
        Fail "Unable to read Firestore single-field overrides for $ProjectId. $details"
    }

    $jsonText = ($gcloudOutput | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($jsonText)) {
        return @()
    }

    $fieldConfigs = @($jsonText | ConvertFrom-Json)
    $productionOverrides = New-Object System.Collections.Generic.List[object]

    foreach ($fieldConfig in $fieldConfigs) {
        $normalized = Convert-ProductionFieldOverride -FieldConfig $fieldConfig
        if ($null -ne $normalized) {
            $productionOverrides.Add($normalized)
        }
    }

    return @($productionOverrides)
}

function Get-MissingFieldOverrides([object[]]$ProductionOverrides, [object[]]$LocalOverrides) {
    $localByKey = @{}
    foreach ($localOverride in @($LocalOverrides)) {
        if ($null -eq $localOverride) {
            continue
        }

        $key = "$($localOverride.collectionGroup)|$($localOverride.fieldPath)"
        $localByKey[$key] = $localOverride
    }

    $missingOverrides = New-Object System.Collections.Generic.List[object]
    foreach ($productionOverride in @($ProductionOverrides)) {
        if ($null -eq $productionOverride) {
            continue
        }

        $key = "$($productionOverride.collectionGroup)|$($productionOverride.fieldPath)"
        if (-not $localByKey.ContainsKey($key)) {
            $missingOverrides.Add($productionOverride)
            continue
        }

        $localOverride = $localByKey[$key]
        $productionTokens = [string]::Join(";", @($productionOverride.indexTokens))
        $localTokens = [string]::Join(";", @($localOverride.indexTokens))

        if (($productionOverride.ttl -ne $localOverride.ttl) -or ($productionTokens -ne $localTokens)) {
            $missingOverrides.Add($productionOverride)
        }
    }

    return @($missingOverrides)
}

function Assert-FirestoreFieldOverrideParity([string]$ProjectId, [string]$FirestoreIndexesPath) {
    $localOverrides = Get-LocalFieldOverrides -FirestoreIndexesPath $FirestoreIndexesPath
    $productionOverrides = Get-ProductionFieldOverrides -ProjectId $ProjectId
    $missingOverrides = Get-MissingFieldOverrides -ProductionOverrides $productionOverrides -LocalOverrides $localOverrides

    if ($missingOverrides.Count -eq 0) {
        Write-Host "OK: Firestore field override config matches production." -ForegroundColor Green
        return
    }

    $exportOverrides = @()
    foreach ($missingOverride in $missingOverrides) {
        $exportOverrides += Convert-FieldOverrideToExportShape -FieldOverride $missingOverride
    }

    $snippet = $exportOverrides | ConvertTo-Json -Depth 6
    Write-Host "WARN: Production has Firestore single-field overrides that are missing or different in $FirestoreIndexesPath." -ForegroundColor Yellow
    Write-Host "Sync these entries under fieldOverrides before deploying, or rerun with -SkipFieldOverrideDriftCheck if the change is intentional." -ForegroundColor Yellow
    Write-Host $snippet -ForegroundColor Yellow

    Fail "Firestore field override drift detected."
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
$firestoreIndexesPath = Join-Path $repoRoot "firestore.indexes.json"
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

    if (-not $SkipFieldOverrideDriftCheck) {
        Write-Step "Checking Firestore field override drift"
        Assert-FirestoreFieldOverrideParity -ProjectId $ProjectId -FirestoreIndexesPath $firestoreIndexesPath
    }

    if (-not $SkipInstall) {
        Write-Step "Installing dependencies"
        npm install --legacy-peer-deps
        Assert-LastExitCode "Dependency installation failed."
    }

    Write-Step "Running production build"
    npm run build
    Assert-LastExitCode "Production build failed."

    Write-Step "Deploying Firebase hosting and Firestore indexes"
    $env:FIREBASE_CLI_EXPERIMENTS = "webframeworks"
    firebase deploy --project $ProjectId --force --only "hosting,firestore:indexes" --non-interactive
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
