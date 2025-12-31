# Playbook Prompting Patterns

This document shows how to prompt agents to create automations like the 40 Tons price tracker.

---

## Pattern 1: Daily Price Tracker

### Prompt Template
```
Track [BRAND] prices across these dispensaries daily at 9 AM:
- [URL 1]
- [URL 2]
- [URL 3]

Log results to Google Sheet [SHEET_ID] with columns:
Date, Dispensary, Product, Price, Stock Status
```

### Example (40 Tons)
```
Track 40 Tons prices across these dispensaries daily at 9 AM:
- https://weedmaps.com/dispensaries/sunnyside-chicago?filter[brandSlugs][]=40-tons
- https://weedmaps.com/dispensaries/rise-naperville?filter[brandSlugs][]=40-tons
- https://weedmaps.com/dispensaries/zen-leaf-chicago?filter[brandSlugs][]=40-tons

Log results to Google Sheet 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

---

## Pattern 2: Competitive Intelligence

### Prompt Template
```
Generate a competitive intelligence report for [MY_BRAND].
Compare our pricing against [COMPETITOR_LIST].
Focus on [CATEGORY] products in [MARKET/REGION].
```

### Example
```
Generate a competitive intelligence report for 40 Tons.
Compare our pricing against Verano, Cresco, and GTI.
Focus on flower and vapes in the Chicago market.
```

---

## Pattern 3: Scheduled Email Reports

### Prompt Template
```
Every [SCHEDULE] send me an email with:
- [DATA_SOURCE_1] summary
- [DATA_SOURCE_2] changes
- Top [N] recommendations
```

### Example
```
Every Monday at 9 AM send me an email with:
- Weekly sales summary from Pops
- Competitor price changes from Ezal
- Top 5 product recommendations to stock
```

---

## Pattern 4: Inventory Alert

### Prompt Template
```
Alert me when [PRODUCT_PATTERN] goes below [THRESHOLD] units.
Check inventory every [INTERVAL].
Notify via [CHANNEL].
```

### Example
```
Alert me when any 40 Tons SKU goes below 50 units.
Check inventory every 4 hours.
Notify via SMS and email.
```

---

## Tool Reference

| Tool | Purpose | Example |
|------|---------|---------|
| `weedmaps.scrape` | Scrape Weedmaps dispensary menus | `{urls: [...], formatForSheets: true}` |
| `sheets.append` | Add rows to Google Sheet | `{spreadsheetId: "...", range: "Sheet1!A:G", values: [[...]]}` |
| `sheets.createSpreadsheet` | Create new Google Sheet | `{title: "Price Tracker"}` |
| `scheduler.create` | Create scheduled trigger | `{cron: "0 9 * * *", task: "..."}` |

---

## Activation Tips

1. **Connect Google Sheets** first in Settings > Integrations
2. **Use Weedmaps URLs with brand filter** for cleaner data
3. **Start with 3-5 dispensaries** then scale up
4. **Check the Playbooks tab** for pre-built templates
