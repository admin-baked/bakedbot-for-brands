# NotebookLM MCP - Quick Reference Card

## 🚀 One-Liner Examples

### PowerShell (Direct API)

```powershell
# Health check
Invoke-RestMethod http://34.121.173.152:8080/health

# List tools
Invoke-RestMethod http://34.121.173.152:8080/mcp/list

# Quick question
$body = @{tool_name="chat_with_notebook"; arguments=@{request=@{message="What is this about?"}}} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://34.121.173.152:8080/mcp/call -Method POST -Headers @{'Content-Type'='application/json'} -Body $body
```

### TypeScript (Using Client)

```typescript
import { notebookLM, askNotebookLM } from '@/server/services/notebooklm-client';

// Simplest way - just ask a question
const answer = await askNotebookLM('What are the key insights?');

// With full client
const response = await notebookLM.chat({
  message: 'Analyze competitor pricing strategies'
});

// Check if ready
const ready = await isNotebookLMReady();
```

---

## 📋 Available Tools (8)

| Tool | Purpose | Args |
|------|---------|------|
| `healthcheck` | Check service status | None |
| `chat_with_notebook` | Complete chat (send + receive) | `message`, `notebook_id?` |
| `send_chat_message` | Send without waiting | `message`, `wait_for_response?` |
| `get_chat_response` | Get response | `timeout?` |
| `get_quick_response` | Get current state | None |
| `navigate_to_notebook` | Switch notebooks | `notebook_id` |
| `get_default_notebook` | Get current notebook | None |
| `set_default_notebook` | Set default | `notebook_id` |

---

## 🎯 Common Patterns

### Pattern 1: Simple Question
```typescript
const answer = await askNotebookLM('What pricing strategy works best?');
console.log(answer);
```

### Pattern 2: Competitive Analysis
```typescript
const insight = await notebookLM.chat({
  message: `Analyze Competitor X's approach to ${topic}`
});
if (!insight.error) {
  console.log(insight.response);
}
```

### Pattern 3: Batch Research
```typescript
const questions = [
  'What are top trends?',
  'What do customers want?',
  'What are competitors doing?'
];
const results = await batchQuery(questions);
```

### Pattern 4: Multi-Step Research
```typescript
// Send query
await notebookLM.sendMessage({
  message: 'Research cannabis delivery market',
  waitForResponse: false
});

// Do other work...

// Get response later
const result = await notebookLM.getResponse(60);
```

---

## 🛠️ Tool Call Format

**All tools use this structure:**

```json
{
  "tool_name": "toolname",
  "arguments": {
    "request": {
      // tool-specific params here
    }
  }
}
```

**Examples:**

```json
// Chat
{
  "tool_name": "chat_with_notebook",
  "arguments": {
    "request": {
      "message": "Your question here"
    }
  }
}

// Navigate
{
  "tool_name": "navigate_to_notebook",
  "arguments": {
    "request": {
      "notebook_id": "notebook-id-here"
    }
  }
}

// Send message
{
  "tool_name": "send_chat_message",
  "arguments": {
    "request": {
      "message": "Your message",
      "wait_for_response": true
    }
  }
}
```

---

## 🔍 Response Format

**Success Response:**
```json
{
  "success": true,
  "tool": "chat_with_notebook",
  "result": {
    "type": "text",
    "text": "{\"response\":\"Answer here\",\"authenticated\":true}"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional info"
}
```

---

## 🎨 Agent Integration Examples

### Big Worm - Competitive Intel
```typescript
import { askNotebookLM } from '@/server/services/notebooklm-client';

const intel = await askNotebookLM(
  `Competitor analysis: ${competitor} pricing for ${product}`
);
```

### Ezal - Market Research
```typescript
const market = await notebookLM.chat({
  message: `Market trends for ${category} in ${region}`
});
```

### Craig - Campaign Ideas
```typescript
const ideas = await askNotebookLM(
  `Marketing strategies for ${product} targeting ${audience}`
);
```

### Smokey - Product Knowledge
```typescript
const info = await askNotebookLM(
  `Tell me about ${productType} effects and recommended usage`
);
```

---

## ⚡ Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not authenticated" | Run `.\auth-setup.ps1` to log into Google |
| "Connection refused" | Check VM is running: `gcloud compute instances list` |
| "Session not found" | Wait 5 seconds after service restart |
| "Timeout" | Increase timeout in request (default 30s) |
| Empty response | Check logs: `.\diagnose.ps1` |

---

## 📊 Health Check

```typescript
const health = await notebookLM.healthCheck();
console.log(health);
// {
//   healthy: true,
//   authenticated: true,
//   status: 'running'
// }
```

---

## 🔐 Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Basic health |
| `/health` | GET | Detailed status + session |
| `/mcp/list` | GET | List available tools |
| `/mcp/call` | POST | Execute tool |
| `/execute` | POST | Legacy endpoint |

---

## 📦 Service Info

**VM Details:**
- Host: `notebooklm-vm`
- Zone: `us-central1-a`
- IP: `34.121.173.152`
- Port: `8080`

**Service:**
- Name: `bakedbot-sidecar`
- Auto-start: Yes
- Auto-restart: Yes (10s delay)

**Logs:**
```bash
# View logs
gcloud compute ssh notebooklm-vm --zone=us-central1-a \
  --command='sudo journalctl -u bakedbot-sidecar -f'

# Check status
gcloud compute ssh notebooklm-vm --zone=us-central1-a \
  --command='sudo systemctl status bakedbot-sidecar'
```

---

## 🧪 Test Scripts

```powershell
# Comprehensive tests
.\test-mcp.ps1

# Chat test
.\test-chat.ps1

# Diagnostics
.\diagnose.ps1

# Authentication setup
.\auth-setup.ps1
```

---

## 📚 Documentation

- **Full Guide**: `INTEGRATION-COMPLETE.md`
- **Usage Examples**: `USAGE-EXAMPLES.md`
- **This File**: `QUICK-REFERENCE.md`
- **Tool Schemas**: `tools-schema.json`

---

## 💡 Tips

1. **Rate Limit**: 2-3 seconds between requests
2. **Cache**: Cache frequent queries (1 hour TTL)
3. **Retry**: Implement retry logic (2-3 attempts)
4. **Timeout**: Use 30s for quick, 60s for deep research
5. **Error Handling**: Always check `response.error`

---

## 🎯 Next Steps

1. ✅ Integration complete
2. ⚠️ Complete authentication (`.\auth-setup.ps1`)
3. 🧪 Test with `.\test-chat.ps1`
4. 🚀 Integrate into agents (see USAGE-EXAMPLES.md)
5. 📊 Monitor performance and adjust

---

**Quick Start:** Run `.\test-mcp.ps1` to verify everything works!
