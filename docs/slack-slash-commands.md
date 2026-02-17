# Slack Slash Commands Setup Guide

## Overview

Slash commands provide a quick way to invoke agents directly from Slack without mentioning the bot.

**Endpoint:** `POST /api/webhooks/slack/commands`

## Configuration

### 1. Create Slash Commands in Slack App Settings

Go to [api.slack.com/apps/A0AF6BKMWLT/slash-commands](https://api.slack.com/apps/A0AF6BKMWLT/slash-commands)

Create the following slash commands:

#### `/ask`
- **Request URL:** `https://bakedbot.ai/api/webhooks/slack/commands`
- **Short Description:** Ask any agent a question
- **Usage hint:** `[agent-name] [question]`
- **Example:** `/ask linus what's the build status?`

#### `/agent`
- **Request URL:** `https://bakedbot.ai/api/webhooks/slack/commands`
- **Short Description:** Route to specific agent
- **Usage hint:** `[agent-name] [message]`

#### `/ezal`
- **Request URL:** `https://bakedbot.ai/api/webhooks/slack/commands`
- **Short Description:** Ask Ezal (competitive intel)
- **Usage hint:** `[question]`
- **Example:** `/ezal competitor pricing update`

### 2. Update OAuth Scopes

Add these scopes to your bot token (already present, but verify):
- `chat:write` — Post messages
- `commands` — Receive slash command events

### 3. Reinstall App

After adding slash commands, reinstall the app in your workspace.

---

## Usage Examples

### Basic Agent Query
```
/ask linus what's failing in the build?
```
Routes to Linus (CTO), who responds with build status.

### Direct Agent Command
```
/ask ezal competitor pricing changes
```
Routes to Ezal (Competitive Intel), triggers intel search.

### Shorthand Commands
```
/ezal what are competitors doing?
/ask craig social campaign ideas
/ask leo operations status
```

---

## Supported Agents

| Command | Agent | Role |
|---------|-------|------|
| `leo` | Leo | COO · Operations |
| `linus` | Linus | CTO · Technology |
| `jack` | Jack | CRO · Revenue |
| `glenda` | Glenda | CMO · Marketing |
| `ezal` | Ezal | Lookout · Competitive Intel |
| `craig` | Craig | Marketer · Campaigns |
| `pops` | Pops | Analyst · Data |
| `smokey` | Smokey | Budtender · Products |
| `parker` | Mrs. Parker | Loyalty |
| `deebo` | Deebo | Compliance |
| `mike` | Money Mike | CFO · Finance |
| `bigworm` | Big Worm | Researcher |
| `day_day` | Day Day | Growth |
| `felisha` | Felisha | Ops · Fulfillment |

---

## Architecture

### Request Flow
```
Slack User
  ↓ /ask linus ...
  ↓
POST /api/webhooks/slack/commands
  ├─ Verify signature (HMAC-SHA256)
  ├─ Parse agent + question
  ├─ Return 200 immediately (required <3s)
  └─ Fire-and-forget
       ↓
       processSlackMessage()
         ├─ Run agent (with SLACK_SYSTEM_USER)
         ├─ Format as Block Kit
         └─ Post to response_url
```

### Response Types

**Ephemeral** (visible to requester only):
- Error messages
- Usage hints
- Validation failures

**In Channel** (visible to all):
- Agent responses
- Success confirmations

---

## Testing

### Test /ask command
```
/ask linus is the build passing?
```

### Test parsing
- `/ask linus what happened?` → Routes to linus with "what happened?"
- `/ask leo operations?` → Routes to leo with "operations?"
- `/ask help` → Routes to leo with "help" (default agent)

### Debug logs
Check Firebase logs for `[Slack/Commands]` entries:
```
[Slack/Commands] /ask from U12345: "linus build status"
```

---

## Troubleshooting

### Signature verification fails
- Verify `SLACK_SIGNING_SECRET` is correct
- Check request timestamp is within 5 minutes
- Ensure raw body is preserved during parsing

### Agent doesn't respond
- Check logs for `[SlackBridge]` entries
- Verify agent keyword is recognized
- Ensure SLACK_BOT_TOKEN is valid

### Response doesn't appear
- Verify response_url is valid
- Check network logs for POST failures
- Ensure JSON payload is well-formed

---

## Future Enhancements

1. **Interactive modals** — `/ask` opens dialog for multi-line input
2. **Command help** — `/ask help` lists all agents + keywords
3. **Agent status** — `/status linus` shows agent availability
4. **Quick shortcuts** — Command blocks in message menus
5. **Rate limiting** — Prevent command spam per user/channel
