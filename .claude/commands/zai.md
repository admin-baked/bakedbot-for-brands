---
description: Switch between AI providers — Z.AI (GLM), Anthropic, or Opencode. Shows current config and switches on request. Trigger phrases: "/zai", "zai", "switch to glm", "switch to anthropic", "switch to z.ai", "check model", "near limit", "check usage".
---

# Switch Model

Switch Claude Code CLI and the app AI stack between providers.

## Step 1 — Show current config

Run:
```bash
node scripts/switch-claude-model.mjs status
```

Report what's active (provider, model names, whether ZAI key is stored).

## Step 2 — Check weekly usage (if user didn't specify a target)

Run:
```bash
node scripts/check-claude-limit.mjs
```

Show the usage bar. If >= 95%, recommend switching to `glm-4.7`.

## Step 3 — Ask which model to switch to (if not already specified)

Present the options:

| Command | Provider | Models |
|---------|----------|--------|
| `glm-4.7` | Z.AI standard | GLM-4.7 (all tiers) |
| `glm-5` | Z.AI premium | GLM-5 (all tiers) |
| `glm-4.5-air` | Z.AI lite | GLM-4.5 Air (fastest) |
| `anthropic` | Anthropic direct | Sonnet 4.6 / Opus 4.6 |
| `opencode` | Z.AI + Opencode | zen/big-pickle (free) |
| `opencode-kimi` | Z.AI + Opencode | zen/kimi-k2.5 (free, long-ctx) |

If the user already said which one (e.g. "/switch glm-4.7" or "switch to anthropic"), skip the question.

## Step 4 — Run the switch

```bash
node scripts/switch-claude-model.mjs <target>
```

## Step 5 — Recovery reminder

After switching to any Z.AI model, always print the emergency recovery command so the user has it handy:

```
If Claude Code stops responding, paste this in any terminal to restore Anthropic:

node -e "const fs=require('fs'),os=require('os'),path=require('path'); const p=path.join(os.homedir(),'.claude','settings.json'); const s=JSON.parse(fs.readFileSync(p,'utf8')); delete s.env.ANTHROPIC_BASE_URL; delete s.env.ANTHROPIC_API_KEY; fs.writeFileSync(p,JSON.stringify(s,null,2),'utf8'); console.log('Restored');"

Then restart Claude Code.
```

## Step 6 — Restart reminder

Tell the user: **restart Claude Code** for the switch to take effect. The settings are read at startup.
