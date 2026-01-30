---
description: Kill all terminal processes (Node.js) to reset the environment
---

Step 1: Kill all Node.js processes
// turbo
```powershell
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
```

Step 2: Verify no node processes are running
```powershell
Get-Process node -ErrorAction SilentlyContinue
```
