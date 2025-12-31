# Playbook Prompting Patterns

Best practices for creating automations based on the "40 Tons" daily tracker pattern and learnings from production campaigns.

---

## 🎯 Core Patterns

### Pattern 1: Daily Price Tracker (Agent Discovery)

**Prompt Template:**
```
Track [BRAND] prices across these dispensaries daily at 9 AM:
- [URL 1]
- [URL 2]
- [URL 3]

Log results to Google Sheet [SHEET_ID] with columns:
Date, Dispensary, Product, Price, Stock Status
```

**Example:**
```
Track 40 Tons prices daily at 9 AM at:
- https://weedmaps.com/dispensaries/sunnyside-chicago?filter[brandSlugs][]=40-tons
- https://weedmaps.com/dispensaries/rise-naperville?filter[brandSlugs][]=40-tons

Log to Sheet 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

---

### Pattern 2: Lead Discovery Campaign

**Prompt Template:**
```
Discover [BUSINESS_TYPE] in [REGION] that have email addresses.
Save to Google Sheet with columns: [COLUMN_LIST].
Email [N] per day with message: [TEMPLATE].
Verify emails before sending.
```

**Key Learnings (from production):**
- ✅ **Pre-define column mapping** before running (Business=A, Email=B, etc.)
- ✅ **Verify emails first** via QuickEmailVerification  
- ✅ **Set bounce threshold** (pause at 10%)
- ✅ **Add UTM tracking** to all links
- ⚠️ **Large sheets (10k+ rows)** can hit API limits - paginate or filter

---

### Pattern 3: Weekly Self-Optimization

**Prompt Template:**
```
Every Friday at 4pm, analyze past 7 days:
- Email open rates by segment
- Bounce patterns by domain
- Conversion funnel metrics
Recommend top 3 optimizations. Wait for approval before changes.
```

---

## 🔧 Tool Reference

| Tool | Purpose | Example |
|------|---------|---------|
| `weedmaps.scrape` | Agent Discovery - dispensary menus | `{urls: [...], formatForSheets: true}` |
| `sheets.append` | Add rows to Google Sheet | `{spreadsheetId: "...", range: "Sheet1!A:G", values: [[...]]}` |
| `sheets.createSpreadsheet` | Create new Google Sheet | `{title: "Price Tracker"}` |
| `scheduler.create` | Create scheduled trigger | `{cron: "0 9 * * *", task: "..."}` |

---

## ⚠️ Failure Modes & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| "Column mapping needed" | Agent doesn't know sheet structure | Pre-define: "A=Business, B=Email, C=City" |
| "Permission denied" | OAuth token expired | Reconnect in Settings > Integrations |
| "Sheet too large" | >10k rows causes API limits | Add filters or paginate reads |
| "Automation paused" | Bounce rate hit threshold | Review bounces, clean list, resume |

---

## 🚀 Activation Checklist

1. ✅ Connect Google Sheets in Settings > Integrations
2. ✅ Use Weedmaps URLs **with brand filter** for cleaner data
3. ✅ Pre-define column mapping before large imports
4. ✅ Set bounce thresholds and milestone alerts
5. ✅ Add UTM parameters to all campaign links
