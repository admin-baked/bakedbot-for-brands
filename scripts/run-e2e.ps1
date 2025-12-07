#!/usr/bin/env pwsh
Param()

function Test-PortListening($port) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        return $null -ne $conn
    } catch {
        return $false
    }
}

$port = 3000
$startedServer = $false
$devProc = $null

if (-not (Test-PortListening $port)) {
    Write-Host "Dev server not detected on port $port; starting via helper..."
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $startHelper = Join-Path $scriptDir "start-dev-with-firebase.ps1"
    $cmd = "& '$startHelper'"
    $args = @('-NoProfile','-ExecutionPolicy','Bypass','-Command',$cmd)
    $devProc = Start-Process -FilePath powershell -ArgumentList $args -WorkingDirectory (Resolve-Path "$scriptDir\..\") -PassThru -NoNewWindow
    $startedServer = $true
    # Wait for server to come up (increase timeout)
    $max = 120
    for ($i=0; $i -lt $max; $i++) {
        Start-Sleep -Seconds 1
        if (Test-PortListening $port) { break }
    }
    if (-not (Test-PortListening $port)) {
        Write-Error "Dev server did not start within timeout"
        exit 1
    }
} else {
    Write-Host "Dev server is already running on port $port"
}

Write-Host "Seeding test data..."
npm run seed:test-data

Write-Host "Running Playwright tests..."
npx playwright test --reporter=list
$exitCode = $LASTEXITCODE

if ($startedServer -and $devProc -ne $null) {
    Write-Host "Stopping dev server (pid $($devProc.Id))"
    Stop-Process -Id $devProc.Id -Force -ErrorAction SilentlyContinue
}

exit $exitCode
