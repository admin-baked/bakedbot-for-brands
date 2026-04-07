# Slack Operations & Agent Bridge

This document details the architecture of the **Slack-to-Agent Bridge** and how BakedBot agents interact with the team and retail partners via Slack.

## 🌉 The Agent Bridge (`src/server/services/slack-agent-bridge.ts`)

All Slack messages enter through a single HTTP gateway but are routed dynamically to the correct agent squad member.

### Routing Logic (Tiered Priority)
1.  **Dedicated App ID**: Messages to the **Linus CTO** or **Uncle Elroy** apps route directly by `api_app_id`.
2.  **Explicit Name**: If a message contains "Linus", "Leo", "Pops", etc., it routes to that persona.
3.  **Channel Prefix**: Channels starting with `thrive-syracuse-` automatically route to **Uncle Elroy**.
4.  **Keywords**: "Fix", "bug", "code" → **Linus**. "Revenue", "sales" → **Jack**.
5.  **Default**: Direct Messages (DMs) to the main bot route to **Linus** (CTO). Public channels default to **Puff** (General).

### Tool Classification (`linusNeedsTools`)
Linus uses a regex-based classifier to decide between:
- **Fast Path (GLM)**: Simple greetings or status questions ("Hello", "What model is this?") use a single-pass LLM call.
- **Agentic Path (Claude/Harness)**: Complex requests involving files, code, or terminal commands ("Fix the bug in X", "Deploy to main") trigger the full tool-using harness.

---

## 🎭 Agent Personas & Identities

| Agent | Persona | Real-World Channel | Base Org Focus |
| :--- | :--- | :--- | :--- |
| **Linus** | CTO | `#linus-cto` | `org_bakedbot_internal` |
| **Uncle Elroy** | Store Ops Advisor | `#thrive-syracuse-pilot` | `org_thrive_syracuse` |
| **Leo** | COO | DMs | Shared |
| **Smokey** | Budtender | `#menus-discovery` | Multi-tenant |

### Uncle Elroy (Store Operations)
- **Voice**: Warm, street-smart, helpful, but business-focused.
- **Focus**: Hardwired to **Thrive Syracuse**. 
- **Tools**: CRM (at-risk customers), Sales (top-selling strains), Competitor Intel (Ezal), and Browser Automation (Weedmaps inventory checks).
- **Technical Tasks**: Often delegates to **Opencode (SP13)** for technical analysis.

---

## 🛡️ Security & Approvals (`src/server/services/slack-approval.ts`)

BakedBot agents have **Zero Secret Hardcoding**.
- **HMAC Verification**: Every Slack request is verified via `SLACK_SIGNING_SECRET` before processing.
- **Identity Elevation**: Requests are run as `SLACK_SYSTEM_USER` (`role: super_user`).
- **High-Risk Approvals**: Commands like `git push`, `npm run fix-build`, or `run_command` trigger a Slack **Approval Block**.
- **Action**: The bot posts a persistent UI block in the thread. A human (often @martin or @jack) must click **Approve** or **Reject** in Slack for the agent to proceed.

---

## 🧠 Memory & History

- **Context Injection**: Every Slack request prepends the last 30 messages of **History** to the prompt to maintain conversation state.
- **Letta Memory**: Linus (only) pulls matching snippets from the **Letta organizational memory** (Hive Mind) to ground decisions in past architecture or bug reports.
- **Archiving**: All responses are archived to the `slack_responses` Firestore collection for auditing.

---

## ⚙️ Configuration Gotchas
- **Slack App ID**: The `SLACK_LINUS_APP_ID` and `SLACK_ELROY_APP_ID` must be correctly set in `apphosting.yaml`. If missing, routing falls back to keyword matching.
- **Bot Context**: Agents are often confused when "OpenCode" (their sub-agent) doesn't know about Thrive Syracuse. **Tip**: Always mention the Org ID in delegated tasks.
