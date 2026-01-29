# NotebookLM MCP Integration for BakedBot

**Status**: ✅ Fully Operational (Authentication Pending)

Complete integration of NotebookLM with BakedBot's agent system via Model Context Protocol (MCP).

---

## 🚀 Quick Start

### 1. Authenticate (One Time Setup)
```powershell
# Easiest method: Export cookies from Chrome
.\auth-via-cookies.ps1
```
See [AUTHENTICATION.md](AUTHENTICATION.md) for all authentication methods.

### 2. Test Integration
```powershell
# Test all functionality
.\test-mcp.ps1

# Test chat specifically
.\test-chat.ps1
```

### 3. Use in Your Code
```typescript
import { askNotebookLM } from '@/server/services/notebooklm-client';

const answer = await askNotebookLM('What are the key insights?');
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[AUTHENTICATION.md](AUTHENTICATION.md)** | Complete auth guide (5 methods) |
| **[USAGE-EXAMPLES.md](USAGE-EXAMPLES.md)** | 14 practical examples with code |
| **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** | Cheat sheet & one-liners |
| **[INTEGRATION-COMPLETE.md](INTEGRATION-COMPLETE.md)** | Full technical docs |

---

## 🎯 What You Can Do

### Competitive Intelligence (Big Worm)
```typescript
import { bigWormResearch } from '@/server/agents/big-worm/notebooklm-tools';

const intel = await bigWormResearch.researchCompetitor('Competitor X', 'pricing');
const trends = await bigWormResearch.analyzeMarketTrends('CBD products', 'California');
const gaps = await bigWormResearch.findMarketGaps('cannabis delivery');
```

### Market Research (Ezal)
```typescript
const insights = await notebookLM.chat({
  message: 'What are customer pain points in cannabis delivery?'
});
```

### Marketing Campaigns (Craig)
```typescript
const ideas = await askNotebookLM(
  'Marketing strategies for CBD wellness targeting millennials'
);
```

### Product Knowledge (Smokey)
```typescript
const info = await askNotebookLM(
  'Tell me about Indica effects and recommended dosage'
);
```

---

## 🛠️ Available Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `chat_with_notebook` | Ask questions | "What's the pricing strategy?" |
| `send_chat_message` | Async queries | Send question, get response later |
| `get_chat_response` | Retrieve response | Get pending response |
| `healthcheck` | Check status | Verify service is running |
| `navigate_to_notebook` | Switch notebooks | Change active research notebook |

8 tools total. See [QUICK-REFERENCE.md](QUICK-REFERENCE.md) for all tools.

---

## 🏗️ Architecture

```
Your App (TypeScript)
    ↓
notebooklm-client.ts (Helper)
    ↓
FastAPI Bridge (VM: 34.121.173.152:8080)
    ↓
NotebookLM MCP Server (localhost:8001)
    ↓
Chrome Beta + Selenium
    ↓
NotebookLM (notebooklm.google.com)
```

---

## 🧪 Testing

### PowerShell Scripts
```powershell
.\test-mcp.ps1          # Comprehensive tests (4 tests)
.\test-chat.ps1         # Test chat functionality
.\diagnose.ps1          # Diagnostic information
.\check-auth.ps1        # Check authentication status
```

### TypeScript Test
```bash
npx tsx scripts/test-notebooklm.ts
```

### Manual Test
```powershell
Invoke-RestMethod -Uri "http://34.121.173.152:8080/health"
```

---

## 📊 Service Info

**VM**: notebooklm-vm (us-central1-a)
**IP**: 34.121.173.152
**Port**: 8080
**Status**: http://34.121.173.152:8080/health

**Logs**:
```bash
gcloud compute ssh notebooklm-vm --zone=us-central1-a \
  --command='sudo journalctl -u bakedbot-sidecar -f'
```

**Service Control**:
```bash
sudo systemctl status bakedbot-sidecar    # Check status
sudo systemctl restart bakedbot-sidecar   # Restart
sudo systemctl stop bakedbot-sidecar      # Stop
```

---

## 🔧 Configuration

**Files**:
- `main.py` - FastAPI bridge
- `notebooklm-config.json` - MCP config
- `.env` - Environment variables (on VM)
- `bakedbot-sidecar.service` - Systemd service

**Environment** (VM: `/opt/bakedbot-sidecar/.env`):
```bash
ENABLE_NOTEBOOKLM_MCP=true
NOTEBOOKLM_NOTEBOOK_ID=59f47d3e-9e5c-4adc-9254-bd78f076898c
NOTEBOOKLM_CONFIG=/opt/bakedbot-sidecar/notebooklm-config.json
PORT=8080
```

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not authenticated" | Run `.\auth-via-cookies.ps1` |
| Service not responding | `sudo systemctl restart bakedbot-sidecar` |
| "Session not found" | Wait 10 seconds after restart |
| Chrome crashes | Check logs, may need to restart VM |
| Connection refused | Verify VM is running |

See [AUTHENTICATION.md](AUTHENTICATION.md#troubleshooting) for detailed troubleshooting.

---

## 📦 Deployment

### Initial Deploy
```powershell
.\deploy-to-vm.ps1
```

### Update Code
```powershell
.\update-vm.ps1
```

### Update Authentication
```powershell
.\auth-via-cookies.ps1
```

---

## 🔐 Authentication Methods

1. **Cookie Export** (Recommended) - Export from Chrome, import to VM
2. **OAuth Code** - Use authorization code from Google
3. **Remote CLI** - Run init command remotely
4. **Manual GUI** - Access VM console directly
5. **Programmatic** - Automated for CI/CD

See [AUTHENTICATION.md](AUTHENTICATION.md) for detailed instructions on each method.

---

## 💡 Best Practices

### Rate Limiting
```typescript
// Wait 2-3 seconds between requests
await new Promise(resolve => setTimeout(resolve, 2000));
```

### Caching
```typescript
// Cache frequently-asked questions (1 hour TTL)
const cacheKey = `notebooklm:${query}`;
const cached = await redis.get(cacheKey);
if (cached) return cached;
```

### Error Handling
```typescript
try {
  const result = await notebookLM.chat({ message });
  if (result.error) {
    // Handle gracefully
    return fallbackResponse;
  }
} catch (error) {
  // Log and return fallback
}
```

### Retry Logic
```typescript
// Built into notebooklm-client (2 attempts)
// Or implement custom retry:
for (let i = 0; i < 3; i++) {
  try {
    return await askNotebookLM(question);
  } catch (error) {
    if (i === 2) throw error;
    await sleep(1000 * (i + 1));
  }
}
```

---

## 🎨 Integration Examples

### Example 1: Competitive Analysis Dashboard
```typescript
const competitors = ['Brand A', 'Brand B', 'Brand C'];
const analyses = await Promise.all(
  competitors.map(c =>
    bigWormResearch.researchCompetitor(c, 'all')
  )
);

// Display in dashboard
renderCompetitiveMatrix(analyses);
```

### Example 2: Customer Query Enhancement
```typescript
async function enhanceResponse(userQuery: string) {
  const baseResponse = await generateChatResponse(userQuery);

  // Augment with NotebookLM research
  const research = await askNotebookLM(
    `Additional context for: ${userQuery}`
  );

  return combineResponses(baseResponse, research);
}
```

### Example 3: Daily Intelligence Report
```typescript
// Run as cron job
async function generateDailyReport() {
  const queries = [
    'Top market trends this week',
    'Competitor pricing changes',
    'Customer sentiment insights',
    'Regulatory updates'
  ];

  const insights = await batchQuery(queries);

  await sendReport('leo@bakedbot.ai', insights);
}
```

---

## 📈 Monitoring

### Health Check
```typescript
const health = await notebookLM.healthCheck();
if (!health.authenticated) {
  await sendAlert('NotebookLM needs re-authentication');
}
```

### Usage Tracking
```typescript
import { logger } from '@/lib/logger';

logger.info('NotebookLM query', {
  agent: 'big-worm',
  query: query.substring(0, 100),
  authenticated: response.authenticated,
  responseLength: response.response.length
});
```

---

## 🔄 Maintenance

### Refresh Authentication (Every 30 days)
```powershell
.\auth-via-cookies.ps1
```

### Update Service
```powershell
# Update main.py with changes
.\update-vm.ps1
```

### Check Logs
```bash
gcloud compute ssh notebooklm-vm --zone=us-central1-a \
  --command='sudo journalctl -u bakedbot-sidecar --since "1 hour ago"'
```

### Backup Chrome Profile
```bash
gcloud compute ssh notebooklm-vm --zone=us-central1-a \
  --command='sudo tar -czf chrome-profile-backup.tar.gz /opt/bakedbot-sidecar/chrome_profile_notebooklm/'
```

---

## ✅ Checklist

- [ ] VM running and accessible
- [ ] Service running (`sudo systemctl status bakedbot-sidecar`)
- [ ] Authentication complete (`.\test-chat.ps1` shows `authenticated: true`)
- [ ] TypeScript client imported in your code
- [ ] First query tested successfully
- [ ] Integrated into at least one agent
- [ ] Error handling implemented
- [ ] Monitoring/logging added

---

## 🆘 Support

**Documentation**: All `.md` files in this directory
**Test Scripts**: All `.ps1` files
**TypeScript Client**: `src/server/services/notebooklm-client.ts`
**Agent Tools**: `src/server/agents/big-worm/notebooklm-tools.ts`

**VM Access**:
```bash
gcloud compute ssh notebooklm-vm --zone=us-central1-a
```

**Service Logs**:
```bash
sudo journalctl -u bakedbot-sidecar -f
```

---

## 🎉 You're Ready!

1. Authenticate: `.\auth-via-cookies.ps1`
2. Test: `.\test-chat.ps1`
3. Integrate: Use examples from `USAGE-EXAMPLES.md`
4. Deploy: Start using in your agents!

The NotebookLM integration is complete and ready for production use! 🚀

---

**Version**: 2.0.0
**Last Updated**: January 29, 2026
**Status**: Production Ready (pending authentication)
