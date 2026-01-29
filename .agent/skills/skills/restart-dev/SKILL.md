---
name: restart-dev
description: Kill any running dev server processes and restart npm run dev. Use when you need to restart the development server after changes.
allowed-tools: Bash
---

# Restart Dev Server Skill

Safely kills running dev server processes and restarts `npm run dev`.

## What This Does

1. Finds and kills any running Next.js dev server processes
2. Waits briefly to ensure clean shutdown
3. Starts a fresh `npm run dev` in the background
4. Confirms the server is starting

## Usage

Simply invoke with: `/restart-dev`

## Implementation

When invoked, immediately execute the following:

```bash
powershell -ExecutionPolicy Bypass -File .agent/skills/skills/restart-dev/scripts/restart-dev.ps1
```

The script will:
1. Kill any process using port 3000 (default Next.js dev port)
2. Kill any running `next dev` processes
3. Wait 2 seconds for clean shutdown
4. Start `npm run dev` in a PowerShell background job
5. Tail the logs to confirm startup

## Expected Output

You should see:
- ✓ Process cleanup confirmation
- ✓ Dev server started message
- 📝 Recent server logs showing initialization

## Notes

- Safe to run even if no dev server is currently running
- Works on Windows (PowerShell) environment
- The new dev server will run in a background PowerShell job
- Check logs anytime with: `Get-Content .next/dev-server.log -Tail 20 -Wait`
- View running jobs with: `Get-Job`
- Stop the server with: `Get-Job | Where-Object {$_.Command -like "*npm run dev*"} | Stop-Job; Get-Job | Where-Object {$_.State -eq "Stopped"} | Remove-Job`
