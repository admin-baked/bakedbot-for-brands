---
description: Generate weekly Claude Code insights report — reads session data, extracts friction points, suggests CLAUDE.md rules, saves dated report to Super User Drive, emails summary to martez@bakedbot.ai. Trigger phrases: "weekly insights", "usage report", "weekly report", "how did I use Claude this week", "insights report".
---

# Weekly Insights Report

Analyze the past week of Claude Code sessions, extract friction and wins, suggest improvements, save to Super User Drive, and email a summary.

## Steps

### Step 1: Run /insights to refresh the data
The built-in `/insights` command generates fresh session analysis. Run it first to ensure the facets data is up to date.

### Step 2: Read the raw facets data
Read all JSON files from `C:\Users\admin\.claude\usage-data\facets\` to get session-level data:
- `outcome` (fully_achieved, partially_achieved, not_achieved)
- `friction_counts` and `friction_detail`
- `user_satisfaction_counts`
- `goal_categories`
- `brief_summary`

Also read the generated report at `C:\Users\admin\.claude\usage-data\report.html` if it exists.

### Step 3: Aggregate and analyze
Compute:
- Total sessions, satisfaction rate, goal achievement rate
- Top friction patterns (ranked by frequency × impact)
- Top goal categories (what you spent time on)
- Notable wins and recurring blockers

### Step 4: Extract top friction points
For each friction point, determine:
- **What it is**: the specific pattern (OOM, missed root cause, stale notifications, etc.)
- **How often**: number of sessions affected
- **Impact**: high/medium/low
- **Root cause**: why does this keep happening?

### Step 5: Suggest CLAUDE.md rules
For each friction point, draft a specific rule to add to CLAUDE.md:
- Which section it belongs in
- The exact rule text
- Why it prevents the friction

Ask: "Is this rule already in CLAUDE.md?" — only suggest new ones.

### Step 6: Suggest features to try
Based on the session patterns, suggest 2-3 Claude Code features not yet in use that would address the friction:
- Hooks, custom skills, scheduled agents, MCP servers, etc.
- Be specific about which friction each feature solves

### Step 7: Save dated report to Super User Drive
Write the report to `C:\Users\admin\.claude\insights\weekly-reports\YYYY-MM-DD-weekly-insights.md`:

```markdown
# Claude Code Weekly Insights — Week of YYYY-MM-DD

**Generated:** YYYY-MM-DD HH:MM
**Sessions analyzed:** N
**Goal achievement:** X%
**Satisfaction:** X%

## Headline
<one punchy sentence>

## #1 Priority This Week
<single highest-leverage change>

## Top Friction Points
| Issue | Frequency | Impact |
|-------|-----------|--------|
| ...   | ...       | ...    |

## What Worked
- ...

## Suggested CLAUDE.md Rules
### [Section Name]
> Rule text
Why: ...

## Features to Try
- **Feature**: Why it fits

## Raw Stats
- Outcomes: ...
- Friction types: ...
- Goal categories: ...
```

### Step 8: Apply any quick CLAUDE.md rules
If there are 1-2 clear, short rules that should be added immediately:
- Add them to the relevant section in CLAUDE.md
- Note which ones were applied vs. suggested for later

### Step 9: Run the mailer script
```bash
node scripts/weekly-insights-mailer.mjs
```

This emails the formatted HTML report to martez@bakedbot.ai via Mailjet.

If Mailjet creds aren't set, run with `--dry-run` and show the report inline instead.

### Step 10: Report summary
```
WEEKLY INSIGHTS REPORT
======================
SESSIONS:      N analyzed
ACHIEVEMENT:   X%
SATISFACTION:  X%
FRICTION:      Top issue — <description>
RULES ADDED:   N to CLAUDE.md
EMAIL:         Sent to martez@bakedbot.ai / DRY RUN
SAVED:         C:\Users\admin\.claude\insights\weekly-reports\YYYY-MM-DD-weekly-insights.md
STATUS:        DONE
```

## Notes
- Reports accumulate in Super User Drive — never delete old ones (trend analysis over time)
- If Mailjet creds missing: set MAILJET_API_KEY + MAILJET_SECRET_KEY in environment
- Run anytime, not just weekly — each run saves a dated snapshot
