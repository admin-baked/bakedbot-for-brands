# Restart Dev Server Skill

A convenient slash command to restart your Next.js development server.

## Usage

Simply type in your Claude Code chat:

```
/restart-dev
```

or

```
@restart-dev
```

## What It Does

1. Finds and kills any process running on port 3000
2. Kills any running Next.js dev processes
3. Waits for clean shutdown
4. Starts a fresh `npm run dev` in the background
5. Shows you the startup logs

## Files

- `SKILL.md` - Skill definition and instructions
- `scripts/restart-dev.ps1` - PowerShell script that handles the restart logic

## Platform

This skill is designed for Windows with PowerShell. For other platforms, you may need to adapt the PowerShell script.

## Logs

After restart, logs are written to `.next/dev-server.log`.

To monitor logs in real-time:
```powershell
Get-Content .next/dev-server.log -Tail 20 -Wait
```

To view all running background jobs:
```powershell
Get-Job
```

To stop the dev server:
```powershell
Get-Job | Where-Object {$_.Command -like "*npm run dev*"} | Stop-Job
Get-Job | Where-Object {$_.State -eq "Stopped"} | Remove-Job
```
