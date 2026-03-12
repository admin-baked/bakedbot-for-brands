#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [string]$ProjectId = "studio-567050101-bc6e8",
    [string]$Backend = "bakedbot-prod",
    [string]$GitBranch = "main",
    [string]$GitCommit,
    [switch]$AllowDirtyWorktree
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host $Message -ForegroundColor Cyan
}

function Fail([string]$Message) {
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Get-FirebaseExecutable() {
    $firebaseCmd = Get-Command firebase.cmd -ErrorAction SilentlyContinue
    if ($null -ne $firebaseCmd) {
        return $firebaseCmd.Source
    }

    $firebaseCommand = Get-Command firebase -ErrorAction SilentlyContinue
    if ($null -ne $firebaseCommand) {
        return $firebaseCommand.Source
    }

    return $null
}

function Invoke-FirebaseCommand([string[]]$Arguments) {
    $firebaseExecutable = Get-FirebaseExecutable
    if ([string]::IsNullOrWhiteSpace($firebaseExecutable)) {
        Fail "Firebase CLI is required. Install it before running this script."
    }

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    try {
        $output = & $firebaseExecutable @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($output) {
        $output | ForEach-Object { Write-Host $_.ToString() }
    }

    return @{
        ExitCode = $exitCode
        Output = (($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine)
    }
}

Push-Location (Split-Path -Parent $PSScriptRoot)

try {
    if (-not (Test-Path "apphosting.yaml")) {
        Fail "apphosting.yaml is required for App Hosting rollouts."
    }

    Write-Step "Checking git worktree state"
    $worktreeStatus = git status --porcelain
    if ($LASTEXITCODE -ne 0) {
        Fail "Unable to read git worktree state."
    }

    if ($worktreeStatus -and -not $AllowDirtyWorktree) {
        Fail "Working tree is dirty. App Hosting rollouts deploy GitHub source, not local uncommitted changes. Commit/push first or rerun with -AllowDirtyWorktree to redeploy the current remote source."
    }

    if ($worktreeStatus) {
        Write-Host "WARN: Worktree has local changes. This rollout will use the remote repository state, not local uncommitted files." -ForegroundColor Yellow
    }

    Write-Step "Checking App Hosting backend"
    $backendResult = Invoke-FirebaseCommand -Arguments @(
        "apphosting:backends:get",
        $Backend,
        "--project",
        $ProjectId,
        "--non-interactive"
    )
    if ($backendResult.ExitCode -ne 0) {
        Fail "Unable to inspect App Hosting backend $Backend."
    }

    $rolloutArgs = @(
        "apphosting:rollouts:create",
        $Backend,
        "--project",
        $ProjectId,
        "--non-interactive"
    )

    if (-not [string]::IsNullOrWhiteSpace($GitCommit)) {
        Write-Step "Triggering App Hosting rollout for commit $GitCommit"
        $rolloutArgs += @("--git-commit", $GitCommit)
    } else {
        Write-Step "Triggering App Hosting rollout for branch $GitBranch"
        $rolloutArgs += @("--git-branch", $GitBranch)
    }

    $rolloutResult = Invoke-FirebaseCommand -Arguments $rolloutArgs
    if ($rolloutResult.ExitCode -ne 0) {
        if ($rolloutResult.Output -match "already queued or in progress") {
            Write-Host "OK: App Hosting rollout is already queued or in progress for $Backend." -ForegroundColor Green
            exit 0
        }

        Fail "App Hosting rollout trigger failed."
    }

    Write-Host "OK: App Hosting rollout requested for $Backend" -ForegroundColor Green
}
finally {
    Pop-Location
}
