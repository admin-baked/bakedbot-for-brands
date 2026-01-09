# Agent Tools Reference

## Overview
Tools are Zod-schematized functions that agents can invoke to take actions.

---

## Tool Architecture

```
src/server/tools/
├── tool-registry.ts      # Tool discovery & registration
├── base-tool.ts          # Base tool class
├── letta-memory.ts       # Memory persistence
├── email-tool.ts         # Email sending
├── web-search.ts         # Serper search
├── browser.ts            # Browser automation
├── gmail.ts              # Gmail integration
├── sheets.ts             # Google Sheets
├── calendar.ts           # Google Calendar
└── ...
```

---

## Tool Pattern

```typescript
import { z } from 'zod';
import { defineTool } from '@genkit-ai/ai';

export const myTool = defineTool({
  name: 'my_tool',
  description: 'What this tool does',
  inputSchema: z.object({
    param: z.string().describe('Description of param')
  }),
  outputSchema: z.object({
    result: z.string()
  }),
}, async (input) => {
  // Tool implementation
  return { result: 'success' };
});
```

---

## Core Tools

### Memory Tools
| Tool | Description |
|------|-------------|
| `letta_save_fact` | Save to long-term memory |
| `letta_search_memory` | Query memory |
| `letta_update_personal_memory` | Update agent memory block |

### Communication Tools
| Tool | Description |
|------|-------------|
| `send_email` | Send email via SendGrid |
| `send_sms` | Send SMS via Twilio |
| `gmail_send` | Send via Gmail |
| `gmail_read` | Read Gmail inbox |

### Research Tools
| Tool | Description |
|------|-------------|
| `web_search` | Serper web search |
| `browser_navigate` | RTRVR browser automation |
| `firecrawl_scrape` | Website scraping |

### Data Tools
| Tool | Description |
|------|-------------|
| `sheets_read` | Read Google Sheets |
| `sheets_write` | Write to Sheets |
| `calendar_create` | Create calendar event |

### Context Tools
| Tool | Description |
|------|-------------|
| `context_ask_why` | Query decision history |
| `context_log_decision` | Log business decision |

---

## Tool Registry

Tools are registered in `src/server/tools/tool-registry.ts`:

```typescript
import { getToolsForAgent } from '@/server/tools/tool-registry';

const tools = getToolsForAgent('smokey');
// Returns array of tools available to Smokey
```

---

## Linus-Specific Tools

Linus (AI CTO) has special tools for code operations:

| Tool | Description |
|------|-------------|
| `run_health_check` | TypeScript/Jest checks |
| `read_file` | Read codebase files |
| `write_file` | Write/update files |
| `run_command` | Execute shell commands |
| `read_backlog` | Read task backlog |
| `report_to_boardroom` | Send status report |

---

## Related Files
- `src/server/tools/` — All tool implementations
- `src/server/agents/linus.ts` — Linus tools
- `src/ai/genkit-flows.ts` — Tool invocation
