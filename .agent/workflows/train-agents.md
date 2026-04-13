---
description: Run overnight agent training — stress test all agents with domain questions, audit responses, coach weak spots, run dream cycles
---

# /train-agents — Overnight Agent Training Pipeline

Runs the self-improving training loop: generate questions -> stress test agents via Slack -> audit + grade -> coach weak spots -> dream cycle -> repeat.

**Cost: $0** (Gemini Flash + Groq + Gemini 3 Pro — all free tier)

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--loops=N` | `3` | Number of training loops (use `--loops=0` for infinite until 95+) |
| `--agent=NAME` | all | Single agent: `elroy`, `linus`, or `marty` |
| `--dry-run` | off | Preview generated questions without sending |

## Steps

### Step 1: Verify environment

```bash
cd "c:/Users/admin/BakedBot for Brands/bakedbot-for-brands"
```

Confirm `CRON_SECRET` is available:
```bash
grep CRON_SECRET .env.local
```

If not set, abort: "CRON_SECRET not found in .env.local — add it before running."

### Step 2: Kill any existing orchestrator

```bash
# Find and kill any running overnight-orchestrator processes
ps aux | grep overnight-orchestrator | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null
```

### Step 3: Start the orchestrator

Parse user flags from `<args>`. Default to `--loops=3` if no loop count specified.

```bash
source .env.local && CRON_SECRET="$CRON_SECRET" node tmp/overnight-orchestrator.mjs <flags> > tmp/overnight-run.log 2>&1 &
echo "PID: $!"
```

### Step 4: Monitor progress

Use the Monitor tool to tail the log for score/timing events:

```bash
tail -f tmp/overnight-run.log | grep --line-buffered -E "(Loop|Score|Grade|avg|✅|❌|⏱️|RESULT|🏆|📊)"
```

Report each loop's results as they come in:
- Questions answered (count + pass rate)
- Response times per agent (avg/min/max)
- Audit score and grade
- Coaching patches applied
- Dream cycle results

### Step 5: Report final summary

When all loops complete (or user hits Ctrl+C), read `tmp/overnight-progress.json` and report:

```
TRAINING REPORT
===============
LOOPS:      N completed
SCORES:     Loop 1: XX → Loop N: XX (trend)
GRADE:      A/B/C/D/F
AGENTS:     Elroy avg Xs, Linus avg Xs, Marty avg Xs
COACHING:   N patches applied
DREAMS:     N hypotheses confirmed
STATUS:     IMPROVING / PLATEAU / REGRESSING
```

## Important
- The orchestrator sends HMAC-signed Slack webhooks to production — this tests real agent behavior
- 45s delay between messages to stay under Groq 30 req/min limit
- Each loop takes ~15-25 min depending on agent count
- Scores below 95 trigger automatic coaching; 95+ triggers #ceo Slack notification
- Response times should be 5-30s per question (0s = stale response bug)
